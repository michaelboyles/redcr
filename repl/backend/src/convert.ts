import type { Handler } from 'aws-lambda';
import * as ts from "typescript"; 
import transform from '../../../core/src/transform';
import * as tsvfs from '@typescript/vfs';
import { js as beautify } from 'js-beautify';

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

async function tsCompile(source: string, target: ts.ScriptTarget): Promise<string> {
    const compilerOptions: ts.CompilerOptions = {
        module: ts.ModuleKind.ES2020,
        target
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
    return beautify(fsMap.get('/index.js'));
}

export const handler: Handler<ApiGatewayRequest, ApiGatewayResponse> = async (event: ApiGatewayRequest, _ctx) => {
    try {
        const code = decodeURIComponent(event.queryStringParameters.code);
        const target = convertTarget(decodeURIComponent(event.queryStringParameters.target));
    
        return getResponse(200, await tsCompile(code, target));
    }
    catch (err) {
        const msg = err?.message ?? 'Server error';
        return getResponse(500, msg);
    }
};

function convertTarget(target: string) {
    switch (target) {
        case 'ES2020': return ts.ScriptTarget.ES2020;
        case 'ES2019': return ts.ScriptTarget.ES2019;
        case 'ES2018': return ts.ScriptTarget.ES2018;
        case 'ES2017': return ts.ScriptTarget.ES2017;
        case 'ES2016': return ts.ScriptTarget.ES2016;
        case 'ES2015': return ts.ScriptTarget.ES2015;
        case 'ES5':    return ts.ScriptTarget.ES5;
        case 'ES3':    return ts.ScriptTarget.ES3;
    }
    throw Error("Unsupported target: " + target);
}

function getResponse(statusCode: number, body: string): ApiGatewayResponse {
    return {
        statusCode, body, headers: CORS_HEADERS
    };
}
