import * as ts from 'typescript';

export default function(_program: ts.Program, _pluginOptions: object) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            function visitor(node: ts.Node): ts.Node {
                if (!sourceFile.fileName.includes('main')) {
                    return node;
                }

                try {
                    console.log(strKind(node.kind));
                    console.log(node.getFullText())
                    console.log()

                    if (node.kind === ts.SyntaxKind.Block) {
                        console.log('block has parent type ', strKind(node.parent.kind));

                        const block = node as ts.Block;
                        const assignments = getAssignments(block);
                        console.log('mb got N assignments: ', assignments.length);

                        return ctx.factory.createObjectLiteralExpression([
                            ctx.factory.createSpreadAssignment(
                                ctx.factory.createIdentifier('parent') //todo
                            ),
                            ...convertAssignments(ctx, assignments)
                        ]);
                    }

                    return ts.visitEachChild(node, visitor, ctx);
                }
                catch (err) {
                    if (err.message) {
                        err.message = `${err.message}\r\nIn file ${sourceFile.fileName}\r\nAt node ${node.getText()}`;
                    }
                    throw err;
                }
            }

            return ts.visitEachChild(sourceFile, visitor, ctx);
        };
    };
}


function getAssignments(block: ts.Block) {
    const assignments: ts.BinaryExpression[] = [];

    block.statements.forEach(statement => {
        if (statement.kind === ts.SyntaxKind.ExpressionStatement) {
            const exprStatement = statement as ts.ExpressionStatement;
            if (exprStatement.expression.kind === ts.SyntaxKind.BinaryExpression) {
                const binaryExpr = exprStatement.expression as ts.BinaryExpression;
                if (binaryExpr.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                    assignments.push(binaryExpr);
                }
            }
        }
    });
    return assignments;
}
 
function convertAssignments(ctx: ts.TransformationContext, assignments: ts.BinaryExpression[]) {
    return assignments
        .filter(assignment => assignment.left.kind === ts.SyntaxKind.PropertyAccessExpression)
        .map(assignment => {
            const left = assignment.left as ts.PropertyAccessExpression;
            return ctx.factory.createPropertyAssignment(
                left.name,
                assignment.right
            );
        })
}

// Get nodes only of a certain type from a list of nodes
function filterNodes<T extends ts.Node>(kind: ts.SyntaxKind, nodes: ts.Node[]) {
    return nodes.filter(node => node.kind === kind) as T[];
}

function strKind(kind: ts.SyntaxKind) {
    return ts.SyntaxKind[kind];
}
