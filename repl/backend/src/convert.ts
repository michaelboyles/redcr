import type { Handler } from 'aws-lambda';

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

export const handler: Handler<ApiGatewayRequest, ApiGatewayResponse> = async (event: ApiGatewayRequest, _ctx) => {
    const code = decodeURIComponent(event.queryStringParameters.code);

    const response: ApiGatewayResponse = {
        statusCode: 200,
        body: code,
        headers: CORS_HEADERS
    };
    return response;
};
