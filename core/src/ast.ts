import * as ts from 'typescript';

// ================================================================================================
// Additional util functions for manipulating the AST. These could be provided as part of
// NodeFactory but aren't.
// ================================================================================================

export function updateForLoopBody(factory: ts.NodeFactory, node: ts.ForStatement, newBody: ts.Statement): ts.ForStatement {
    return factory.updateForStatement(
        node, node.initializer, node.condition, node.incrementor, newBody
    );
}

export function updateForInBody(factory: ts.NodeFactory, node: ts.ForInStatement, newBody: ts.Statement): ts.ForInStatement {
    return factory.updateForInStatement(
        node, node.initializer, node.expression, newBody
    );
}

export function updateForOfBody(factory: ts.NodeFactory, node: ts.ForOfStatement, newBody: ts.Statement): ts.ForOfStatement {
    return factory.updateForOfStatement(
        node, node.awaitModifier, node.initializer, node.expression, newBody
    );
}

export function createNullishCoallescingOperator(left: ts.Expression, right: ts.Expression): ts.BinaryExpression {
    return ts.factory.createBinaryExpression(
        left, ts.factory.createToken(ts.SyntaxKind.QuestionQuestionToken), right
    )
}
