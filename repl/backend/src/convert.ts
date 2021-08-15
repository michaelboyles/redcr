import type { Handler } from 'aws-lambda';
import * as ts from "typescript"; 
import transform from '../../../core/src/transform';
import * as tsvfs from '@typescript/vfs';

interface ApiGatewayRequest {
    body: string;
    queryStringParameters: Record<string, string>;
    pathParameters: Record<string, string>;
    requestContext: {
        domainName: string;
        path: string;
    };
    headers: Record<string, string>;
}

interface ApiGatewayResponse {
    statusCode: number;
    headers?: object,
    body: string;
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,PATCH'
};

async function tsCompile(source: string): Promise<string> {
    const compilerOptions: ts.CompilerOptions = {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
    }

    // https://www.typescriptlang.org/dev/typescript-vfs/
    const fsMap = tsvfs.createDefaultMapFromNodeModules(compilerOptions);
    fsMap.set('/index.ts', source);    
    
    const system = tsvfs.createSystem(fsMap);
    const host = tsvfs.createVirtualCompilerHost(system, compilerOptions, ts);
    
    const program = ts.createProgram({
      rootNames: [...fsMap.keys()],
      options: compilerOptions,
      host: host.compilerHost
    });

    program.emit(
        program.getSourceFile('/index.ts'), undefined, undefined, false, {
            before: [transform(program, {})]
        }
    );
    return fsMap.get('/index.js');
}

export const handler: Handler<ApiGatewayRequest, ApiGatewayResponse> = async (event: ApiGatewayRequest, _ctx) => {
    const code = decodeURIComponent(event.queryStringParameters.code);

    const response: ApiGatewayResponse = {
        statusCode: 200,
        body: await tsCompile(code),
        headers: CORS_HEADERS
    };
    return response;
};
