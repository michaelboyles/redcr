import * as ts from 'typescript';

interface Assignment {
    memberChain: ts.MemberName[];
    value: ts.Expression;
    binaryExpr: ts.BinaryExpression;
}

interface ObjTreeNode {
    name: ts.MemberName,
    path: ts.MemberName[],
    assignment?: Assignment;
    children: ObjTreeNode[];
}

export default function(_program: ts.Program, _pluginOptions: object) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            function visitor(node: ts.Node): ts.Node {
                if (!sourceFile.fileName.includes('myreducer')) {
                    return node;
                }

                try {
                    // console.log(strKind(node.kind));
                    // console.log(node.getFullText());
                    // console.log();

                    if (node.kind === ts.SyntaxKind.Block) {
                        //console.log('block has parent type ', strKind(node.parent.kind));

                        const block = node as ts.Block;
                        const assignments = parseAssignments(getAssignmentsInBlock(block));
                        checkConflictingAssignments(assignments);

                        const objTree = buildObjTree(assignments);
                        printObjTree(objTree);
                        if (objTree.children.length > 1) {
                            throw Error("Should only modify one variable in a reducer");
                        }
                        if (objTree.children.length === 0) {
                            throw Error("Your reducer doesn't modify anything");
                        }
                        const stateObj = objTree.children[0];

                        return ctx.factory.createBlock([
                            ctx.factory.createReturnStatement(
                                convertObjTree(ctx, stateObj).initializer
                            )
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

// Get all the binary expressions which represent assignments within a block
function getAssignmentsInBlock(block: ts.Block) {
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

// Parse a set of binary expressions representing assignments into a more useful format
function parseAssignments(assignments: ts.BinaryExpression[]): Assignment[] {
    return assignments.map(assignment => {
        const memberChain: ts.MemberName[] = [];

        let expr = assignment.left;
        while (expr.kind === ts.SyntaxKind.PropertyAccessExpression) {
            const propAccessExpr = expr as ts.PropertyAccessExpression;
            memberChain.unshift(propAccessExpr.name);
            expr = propAccessExpr.expression;
        }
        if (expr.kind === ts.SyntaxKind.Identifier) {
            memberChain.unshift(expr as ts.Identifier);
        }

        return {
            memberChain,
            value: assignment.right,
            binaryExpr: assignment
        };
    });
}

// Throw an error if multiple assignments cannot both be performed
function checkConflictingAssignments(assignments: Assignment[]) {
    assignments.forEach(a => {
        assignments.forEach(b => {
            if (a != b && isSubPath(a.memberChain, b.memberChain)) {
                throw new Error('Conflicting assignments! ' + a.binaryExpr.getFullText() + " and " + b.binaryExpr.getFullText() ) 
            }
        })
    })
}

function buildObjTree(assignments: Assignment[]): ObjTreeNode {
    const root: ObjTreeNode = {
        name: null,
        children: [],
        path: []
    };

    assignments.forEach(assignment => {
        let currentNode: ObjTreeNode = root;
        assignment.memberChain.forEach((member, idx) => {
            let childNode = currentNode.children.find(child => child.name.getText() === member.getText());
            const isLast = idx === (assignment.memberChain.length - 1);
            if (!childNode) {
                childNode = {
                    name: member,
                    children: [],
                    path: [...currentNode.path, member],
                    ...(isLast ? { assignment } : {})
                };
                currentNode.children.push(childNode);
            }
            currentNode = childNode;
        })
    });
    return root;
}

function convertObjTree(ctx: ts.TransformationContext, objTree: ObjTreeNode): ts.PropertyAssignment {
    if (objTree.children.length > 0) {
        return ctx.factory.createPropertyAssignment(
            objTree.name,
            ctx.factory.createObjectLiteralExpression([
                ctx.factory.createSpreadAssignment(
                    createChainedPropertyExpr(ctx, objTree.path)
                ),
                ...objTree.children.map(child => convertObjTree(ctx, child) as ts.PropertyAssignment)
            ])
        );
    }
    else {
        return ctx.factory.createPropertyAssignment(objTree.name, objTree.assignment.value);
    }
}

// Create an expression such as x.y.z
function createChainedPropertyExpr(ctx: ts.TransformationContext, names: ts.MemberName[]): ts.Expression {
    if (names.length === 1) {
        return ctx.factory.createIdentifier(names[0].getText());
    }
    return ctx.factory.createPropertyAccessExpression(
        createChainedPropertyExpr(ctx, names.slice(0, -1)), names[names.length - 1].getText()
    );
}

// Return true if the 1st argument is either the same or a sub-path of the 2nd, else false
function isSubPath(a: ts.MemberName[], b: ts.MemberName[]): boolean {
    if (a.length > b.length) return false;
    for (let i = 0; i < a.length; ++i) {
        if (a[i].text !== b[i].text) return false;
    }
    return true;
}

// Get nodes only of a certain type from a list of nodes
function filterNodes<T extends ts.Node>(kind: ts.SyntaxKind, nodes: ts.Node[]) {
    return nodes.filter(node => node.kind === kind) as T[];
}

function strKind(kind: ts.SyntaxKind) {
    return ts.SyntaxKind[kind];
}

function printObjTree(nd: ObjTreeNode, indent: string = '') {
    console.log(indent + nd.name?.getText() + ' ' + (nd?.assignment?.value?.getText() ?? ''));

    nd.children.forEach(child => printObjTree(child, indent + '    '));
}
