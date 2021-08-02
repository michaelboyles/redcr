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
    arrayOperation?: ArrayOperation;
    children: ObjTreeNode[];
}

const supportedArrayOps = ['push', 'pop', 'shift', 'unshift'];
interface ArrayOperation {
    funcName: string,
    memberChain: ts.MemberName[];
    args: ts.Expression[];
}

export default function(_program: ts.Program, _pluginOptions: object) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            function visitor(node: ts.Node): ts.Node {
                try {
                    // if (sourceFile.fileName.includes('main.ts')) {
                    //     console.log(strKind(node.kind));
                    //     console.log(node.getFullText());
                    //     console.log();
                    // }

                    if (node.kind === ts.SyntaxKind.CallExpression) {
                        const callExpr = node as ts.CallExpression;
                        if (callExpr.expression.kind === ts.SyntaxKind.Identifier) {
                            if ((callExpr.expression as ts.Identifier).text === 'redcr') {
                                if (callExpr.arguments.length !== 1) {
                                    throw new Error("redcr must be given precisely 1 argument, found: " + callExpr.arguments.length);
                                }
                                const arg = callExpr.arguments[0];
                                if (arg.kind !== ts.SyntaxKind.ArrowFunction) {
                                    throw new Error("redcr must be given an arrow function");   
                                }
                                const arrowFunction = arg as ts.ArrowFunction;
                                if (arrowFunction.body.kind === ts.SyntaxKind.Block) {
                                    return replaceReducer(ctx, (arrowFunction.body as ts.Block).statements.map(i => i));
                                }
                                else if (isExpression(arrowFunction.body)) {
                                    return replaceReducer(
                                        ctx, [ctx.factory.createExpressionStatement(arrowFunction.body)]
                                    );
                                }
                                throw new Error("Unknown arrow function body type");
                            }
                        }    
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

function replaceReducer(ctx: ts.TransformationContext, statements: ts.Statement[]) {
    const assignments = getAssignmentsInBlock(statements);
    checkConflictingAssignments(assignments);
    const arrayOps = getArrayOpsInStatements(statements);

    const objTree = buildObjTree(assignments, arrayOps);
    //printObjTree(objTree);
    if (objTree.children.length > 1) {
        throw Error("Should only modify one variable in a reducer:  " + objTree.children.map(ch => ch.name.text));
    }
    if (objTree.children.length === 0) {
        throw Error("Your reducer doesn't modify anything");
    }
    const stateObj = objTree.children[0];

    return ctx.factory.createArrowFunction(
        [],
        [],
        [
            ctx.factory.createParameterDeclaration(
                undefined, undefined, undefined, objTree.children[0].name.text
            )
        ],
        undefined,
        ctx.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        ctx.factory.createBlock([
            ctx.factory.createReturnStatement(
                convertObjTree(ctx, stateObj).initializer
            )
        ])
    );
}

// Get all the binary expressions which represent assignments within the given statements
function getAssignmentsInBlock(statements: ts.Statement[]) {
    const assignments: Assignment[] = [];

    statements.forEach(statement => {
        if (statement.kind !== ts.SyntaxKind.ExpressionStatement) return;
        const exprStatement = statement as ts.ExpressionStatement;
        if (exprStatement.expression.kind !== ts.SyntaxKind.BinaryExpression) return;
        const binaryExpr = exprStatement.expression as ts.BinaryExpression;
        if (binaryExpr.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
        assignments.push({
            memberChain: parseMemberChain(binaryExpr.left),
            value: binaryExpr.right,
            binaryExpr
        });
    });
    return assignments;
}

function getArrayOpsInStatements(statements: ts.Statement[]) {
    const arrayOps: ArrayOperation[] = [];

    statements.forEach(statement => {
        if (statement.kind !== ts.SyntaxKind.ExpressionStatement) return;
        const exprStatement = statement as ts.ExpressionStatement;
        exprStatement.forEachChild(child => {
            if (child.kind !== ts.SyntaxKind.CallExpression) return;
            const callExpr = child as ts.CallExpression;
            if (callExpr.expression.kind !== ts.SyntaxKind.PropertyAccessExpression) return;
            const propAccessExpr = callExpr.expression as ts.PropertyAccessExpression;
            const funcName = propAccessExpr.name.getText();
            if (supportedArrayOps.includes(funcName)) {
                const memberChain = parseMemberChain(propAccessExpr);
                memberChain.pop(); // Remove the name of the function
                arrayOps.push({
                    funcName,
                    args: callExpr.arguments.map(arg => arg),
                    memberChain
                });
            }
        });
    });
    return arrayOps;
}

function parseMemberChain(initExpr: ts.Expression) {
    const memberChain: ts.MemberName[] = [];
    let expr: ts.Expression | null = initExpr;
    while (expr) {
        if (expr.kind === ts.SyntaxKind.PropertyAccessExpression) {
            const propAccessExpr = expr as ts.PropertyAccessExpression;    
            memberChain.unshift(propAccessExpr.name);
            expr = propAccessExpr.expression;
        }
        else if (expr.kind === ts.SyntaxKind.NonNullExpression) {
            expr = (expr as ts.NonNullExpression).expression;
        }
        else if (expr.kind === ts.SyntaxKind.Identifier) {
            memberChain.unshift(expr as ts.Identifier);
            expr = null;
        }
        else {
            throw new Error('Unhandled syntax kind ' + strKind(expr.kind))
        }
    }
    return memberChain;
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

function buildObjTree(assignments: Assignment[], arrayOps: ArrayOperation[]): ObjTreeNode {
    const root: ObjTreeNode = {
        name: null as any as ts.MemberName,
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
    // TODO very similar to above... generalise?
    arrayOps.forEach(arrayOp => {
        let currentNode: ObjTreeNode = root;
        arrayOp.memberChain.forEach((member, idx) => {
            let childNode = currentNode.children.find(child => child.name.getText() === member.getText());
            const isLast = idx === (arrayOp.memberChain.length - 1);
            if (!childNode) {
                childNode = {
                    name: member,
                    children: [],
                    path: [...currentNode.path, member],
                    ...(isLast ? { arrayOperation: arrayOp } : {})
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
        let exprValue: ts.Expression | null = null;
        if (objTree.assignment) {
            exprValue = objTree.assignment.value;
        }
        else if (objTree.arrayOperation) {
            if (objTree.arrayOperation.funcName === 'push') {
                exprValue = ctx.factory.createArrayLiteralExpression([
                    ctx.factory.createSpreadElement(
                        createChainedPropertyExpr(ctx, objTree.path)
                    ),
                    ...objTree.arrayOperation.args
                ]);
            }
            else if (objTree.arrayOperation.funcName === 'pop') {
                exprValue = ctx.factory.createCallExpression(
                    createChainedPropertyExpr(ctx, [...objTree.path, ctx.factory.createIdentifier('slice')]),
                    [],
                    [
                        ctx.factory.createNumericLiteral(0),
                        ctx.factory.createSubtract(
                            createChainedPropertyExpr(ctx, [...objTree.path, ctx.factory.createIdentifier('length')]),
                            ctx.factory.createNumericLiteral(1)
                        )
                    ]
                );
            }
            else if (objTree.arrayOperation.funcName === 'shift') {
                exprValue = ctx.factory.createCallExpression(
                    createChainedPropertyExpr(ctx, [...objTree.path, ctx.factory.createIdentifier('slice')]),
                    [],
                    [ctx.factory.createNumericLiteral(1)]
                );
            }
            else if (objTree.arrayOperation.funcName === 'unshift') {
                exprValue = ctx.factory.createArrayLiteralExpression([
                    ...objTree.arrayOperation.args,
                    ctx.factory.createSpreadElement(
                        createChainedPropertyExpr(ctx, objTree.path)
                    )
                ]);
            }
        }

        if (!exprValue) {
            throw new Error(`Expected member '${objTree.name.getText()}' to be assigned a value, or perform an array operation`);
        }
        return ctx.factory.createPropertyAssignment(objTree.name, exprValue);
    }
}

// Create an expression such as x.y.z
function createChainedPropertyExpr(ctx: ts.TransformationContext, names: ts.MemberName[]): ts.Expression {
    if (names.length === 1) {
        return ctx.factory.createIdentifier(names[0].text);
    }
    return ctx.factory.createPropertyAccessExpression(
        createChainedPropertyExpr(ctx, names.slice(0, -1)), names[names.length - 1].text
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
    let str = indent + nd.name?.getText() + ' ';
    if (nd.assignment) {
        str += nd.assignment.value.getText();
    }
    else if (nd.arrayOperation) {
        str += (nd.arrayOperation.funcName + '(' + nd.arrayOperation.args.map(arg => arg.getText()).join() + ')');
    }
    console.log(str);

    nd.children.forEach(child => printObjTree(child, indent + '    '));
}

function isExpression(node: ts.Node): node is ts.Expression {
    // TODO expand this
    const expressions = [
        ts.SyntaxKind.BinaryExpression,
        ts.SyntaxKind.DeleteExpression
    ];
    return expressions.includes(node.kind);
}
