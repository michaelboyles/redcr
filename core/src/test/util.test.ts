import * as ts from 'typescript';
import { strKind } from "../util";

test('Get syntax kind of node as string', () => {
    const ifNode = { kind: ts.SyntaxKind.IfStatement } as ts.Node;
    expect(strKind(ifNode)).toEqual('IfStatement');
});

