import * as ts from 'typescript';

// ================================================================================================
// This file contains functions and types which are completely unspecific to this particular
// application.
// ================================================================================================

// A convenience struct to contain all the state of a transformation, to simplify passing them as
// arguments to functions
export interface TransformState {
    program: ts.Program;
    pluginOptions: object;
    ctx: ts.TransformationContext;
    sourceFile: ts.SourceFile;
}

// Get nodes only of a certain type from a list of nodes
export function filterNodes<T extends ts.Node>(kind: ts.SyntaxKind, nodes: ts.Node[]) {
    return nodes.filter(node => node.kind === kind) as T[];
}

// Converts a node's syntax kind to a string
export function strKind(node: ts.Node) {
    return ts.SyntaxKind[node.kind];
}

// Return true if the node represents an expression, else false
export function isExpression(node: ts.Node): node is ts.Expression {
    // TODO expand this
    const expressions = [
        ts.SyntaxKind.BinaryExpression,
        ts.SyntaxKind.DeleteExpression
    ];
    return expressions.includes(node.kind);
}

// Assert that all possibilities have been exhausted
export function assertExhaustive(arg: never) {
    return arg;
}
