import type { Handler } from 'aws-lambda';
import * as ts from "typescript"; 
import transform from '../../../core/src/transform';

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

function tsCompile(source: string): string {
    const compilerOptions: ts.CompilerOptions = {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021
    } 
    const program = ts.createProgram({
        rootNames: ['input'],
        options: compilerOptions
    });

    const options: ts.TranspileOptions = {
        compilerOptions,
        transformers: {
            before: [
                transform(program, {})
            ]
        }
    };
    return ts.transpileModule(source, options).outputText;
}


console.log(tsCompile(`
interface StringState {
    a: number[];
}

const fooReducer = redcr((state: StringState) => {
    state.a[0] = 1;
});
`))

export const handler: Handler<ApiGatewayRequest, ApiGatewayResponse> = async (event: ApiGatewayRequest, _ctx) => {
    const code = decodeURIComponent(event.queryStringParameters.code);

    const response: ApiGatewayResponse = {
        statusCode: 200,
        body: tsCompile(code),
        headers: CORS_HEADERS
    };
    return response;
};
