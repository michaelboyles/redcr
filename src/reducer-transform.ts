import * as ts from 'typescript';
import { dynamicPropAccess, isPropAccessEqual, memberPropAccess, PropAccess, propAccessToStr } from './prop-access';

interface Assignment {
    accessChain: PropAccess[];
    value: ts.Expression;
    binaryExpr: ts.BinaryExpression;
}

interface ObjTreeNode {
    name: PropAccess,
    path: PropAccess[],
    assignment?: Assignment;
    arrayOperation?: ArrayOperation;
    children: ObjTreeNode[];
}

const supportedArrayOps = ['push', 'pop', 'shift', 'unshift'];
interface ArrayOperation {
    funcName: string,
    accessChain: PropAccess[];
    args: ts.Expression[];
}

interface TransformState {
    program: ts.Program;
    pluginOptions: object;
    ctx: ts.TransformationContext;
    sourceFile: ts.SourceFile;
}

export default function(program: ts.Program, pluginOptions: object) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            const state: TransformState = {program, pluginOptions, ctx, sourceFile};
            function visitor(node: ts.Node): ts.Node {
                try {
                    // if (sourceFile.fileName.includes('main.ts')) {
                    //     console.log(strKind(node.kind));
                    //     console.log(node.getFullText());
                    //     console.log();
                    // }
                    if (ts.isCallExpression(node)) {
                        if (ts.isIdentifier(node.expression)) {
                            if (node.expression.text === 'redcr') {
                                if (node.arguments.length !== 1) {
                                    throw new Error("redcr must be given precisely 1 argument, found: " + node.arguments.length);
                                }
                                const arrowFunction = node.arguments[0];
                                if (!ts.isArrowFunction(arrowFunction)) {
                                    throw new Error("redcr must be given an arrow function");   
                                }
                                const params = arrowFunction.parameters.map(i => i);
                                if (ts.isBlock(arrowFunction.body)) {
                                    arrowFunction.parameters
                                    return replaceReducer(
                                        state, params,
                                        arrowFunction.body.statements.map(i => i)
                                    );
                                }
                                else if (isExpression(arrowFunction.body)) {
                                    return replaceReducer(
                                        state, params,
                                        [ctx.factory.createExpressionStatement(arrowFunction.body)]
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

function replaceReducer(state: TransformState, params: ts.ParameterDeclaration[], statements: ts.Statement[]) {
    const { ctx } = state;
    const assignments = getAssignmentsInBlock(state, statements);
    checkConflictingAssignments(assignments);
    const arrayOps = getArrayOpsInStatements(state, statements);

    const objTree = buildObjTree(assignments, arrayOps);
    //printObjTree(objTree);
    const stateObj = objTree.children[0];

    return ctx.factory.createArrowFunction(
        [],
        [],
        params,
        undefined,
        ctx.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        ctx.factory.createBlock([
            ctx.factory.createReturnStatement(
                convertObjTree(state, stateObj).initializer
            )
        ])
    );
}

// Get all the binary expressions which represent assignments within the given statements
function getAssignmentsInBlock(state: TransformState, statements: ts.Statement[]) {
    const assignments: Assignment[] = [];

    statements.forEach(statement => {
        if (!ts.isExpressionStatement(statement)) return;
        if (!ts.isBinaryExpression(statement.expression)) return;
        const binaryExpr = statement.expression;
        if (binaryExpr.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
        assignments.push({
            accessChain: parseAccessChain(state, binaryExpr.left),
            value: binaryExpr.right,
            binaryExpr
        });
    });
    return assignments;
}

function getArrayOpsInStatements(state: TransformState, statements: ts.Statement[]) {
    const arrayOps: ArrayOperation[] = [];

    statements.forEach(statement => {
        if (!ts.isExpressionStatement(statement)) return;
        statement.forEachChild(child => {
            if (!ts.isCallExpression(child)) return;
            if (!ts.isPropertyAccessExpression(child.expression)) return;
            const propAccessExpr = child.expression;
            const funcName = propAccessExpr.name.getText();
            if (supportedArrayOps.includes(funcName)) {
                const accessChain = parseAccessChain(state, propAccessExpr);
                accessChain.pop(); // Remove the name of the function
                arrayOps.push({
                    funcName,
                    args: child.arguments.map(arg => arg),
                    accessChain
                });
            }
        });
    });
    return arrayOps;
}

function parseAccessChain(state: TransformState, initExpr: ts.Expression) {
    const accessChain: PropAccess[] = [];
    let expr: ts.Expression | null = initExpr;
    while (expr) {
        const exprType = state.program.getTypeChecker().getTypeAtLocation(expr);
        if (ts.isPropertyAccessExpression(expr)) {
            accessChain.unshift(memberPropAccess(expr.name, exprType));
            expr = expr.expression;
        }
        else if (ts.isNonNullExpression(expr)) {
            expr = expr.expression;
        }
        else if (ts.isIdentifier(expr)) {
            accessChain.unshift(memberPropAccess(expr, exprType));
            expr = null;
        }
        else if (ts.isElementAccessExpression(expr)) {
            accessChain.unshift(dynamicPropAccess(expr.argumentExpression, exprType));
            expr = expr.expression;
        }
        else {
            throw new Error('Unhandled syntax kind ' + strKind(expr.kind))
        }
    }
    return accessChain;
}

// Throw an error if multiple assignments cannot both be performed
function checkConflictingAssignments(assignments: Assignment[]) {
    assignments.forEach(a => {
        assignments.forEach(b => {
            if (a != b && isSubPath(a.accessChain, b.accessChain)) {
                throw new Error('Conflicting assignments! ' + a.binaryExpr.getFullText() + " and " + b.binaryExpr.getFullText() ) 
            }
        })
    })
}

function buildObjTree(assignments: Assignment[], arrayOps: ArrayOperation[]): ObjTreeNode {
    const root: ObjTreeNode = {
        name: null as any,
        children: [],
        path: []
    };

    assignments.forEach(assignment => {
        let currentNode: ObjTreeNode = root;
        assignment.accessChain.forEach((propAccess, idx) => {
            let childNode = currentNode.children.find(child => isPropAccessEqual(child.name, propAccess));
            const isLast = idx === (assignment.accessChain.length - 1);
            if (!childNode) {
                childNode = {
                    name: propAccess,
                    children: [],
                    path: [...currentNode.path, propAccess],
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
        arrayOp.accessChain.forEach((propAccess, idx) => {
            let childNode = currentNode.children.find(child => isPropAccessEqual(child.name, propAccess));
            const isLast = idx === (arrayOp.accessChain.length - 1);
            if (!childNode) {
                childNode = {
                    name: propAccess,
                    children: [],
                    path: [...currentNode.path, propAccess],
                    ...(isLast ? { arrayOperation: arrayOp } : {})
                };
                currentNode.children.push(childNode);
            }
            currentNode = childNode;
        })
    });

    return root;
}



function convertObjTree(state: TransformState, objTree: ObjTreeNode): ts.PropertyAssignment {
    const { ctx } = state;
    if (objTree.children.length > 0) {
        if (isArrayType(objTree.name.exprType)) {
            return ctx.factory.createPropertyAssignment(
                getPropertyName(ctx, objTree.name),
                ctx.factory.createCallExpression(
                    ctx.factory.createPropertyAccessExpression(
                        ctx.factory.createIdentifier('Object'), 'assign'
                    ),
                    [],
                    [
                        ctx.factory.createArrayLiteralExpression([
                            ctx.factory.createSpreadElement(
                                createChainedPropertyExpr(ctx, objTree.path)
                            )
                        ]),
                        ctx.factory.createObjectLiteralExpression(
                            objTree.children.map(child => {
                                    if (!child.assignment) throw Error();
                                    return ctx.factory.createPropertyAssignment(
                                        getPropertyName(ctx, child.name),
                                        child.assignment.value
                                    )
                                })
                        )
                    ]
                )
            );
        }
        else {
            return ctx.factory.createPropertyAssignment(
                getPropertyName(ctx, objTree.name),
                ctx.factory.createObjectLiteralExpression([
                    ctx.factory.createSpreadAssignment(
                        createChainedPropertyExpr(ctx, objTree.path)
                    ),
                    ...objTree.children.map(child => convertObjTree(state, child) as ts.PropertyAssignment)
                ])
            );
        }
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
                    ctx.factory.createPropertyAccessExpression(
                        createChainedPropertyExpr(ctx, objTree.path), 'slice'
                    ),
                    [],
                    [
                        ctx.factory.createNumericLiteral(0),
                        ctx.factory.createSubtract(
                            ctx.factory.createPropertyAccessExpression(
                                createChainedPropertyExpr(ctx, objTree.path), 'length'
                            ),
                            ctx.factory.createNumericLiteral(1)
                        )
                    ]
                );
            }
            else if (objTree.arrayOperation.funcName === 'shift') {
                exprValue = ctx.factory.createCallExpression(
                    ctx.factory.createPropertyAccessExpression(
                        createChainedPropertyExpr(ctx, objTree.path), 'slice'
                    ),
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
            throw Error(`Expected member '${propAccessToStr(objTree.name)}' to be assigned a value, or perform an array operation`);
        }
        return ctx.factory.createPropertyAssignment(getPropertyName(ctx, objTree.name), exprValue);
    }
}

function getPropertyName(ctx: ts.TransformationContext, propAccess: PropAccess): ts.PropertyName {
    if (propAccess.type === 'member') {
        return propAccess.member;
    }
    if (propAccess.type === 'dynamic') {
        return ctx.factory.createComputedPropertyName(propAccess.expr)
    }
    const _exhaustiveCheck: never = propAccess;
    return _exhaustiveCheck;
}

function isArrayType(exprType: ts.Type) {
    const props = exprType.getProperties().map(prop => prop.name);
    const isArrayExpr = props.includes('length') && supportedArrayOps.every(op => props.includes(op));
    return isArrayExpr;
}

// Create an expression such as x.y.z
function createChainedPropertyExpr(ctx: ts.TransformationContext, accessChain: PropAccess[]): ts.Expression {
    if (accessChain.length === 1) {
        if (accessChain[0].type === 'member') {
            return ctx.factory.createIdentifier(accessChain[0].member.text);
        }
        throw Error("Don't believe this is possible...");
    }
    const lastElem = accessChain[accessChain.length - 1];
    if (lastElem.type === 'member') {
        return ctx.factory.createPropertyAccessExpression(
            createChainedPropertyExpr(ctx, accessChain.slice(0, -1)), lastElem.member.text
        );
    }
    else if (lastElem.type === 'dynamic') {
        return ctx.factory.createElementAccessExpression(
            createChainedPropertyExpr(ctx, accessChain.slice(0, -1)), lastElem.expr
        );
    }
    const _exhaustiveCheck: never = lastElem;
    return _exhaustiveCheck;
}

// Return true if the 1st argument is either the same or a sub-path of the 2nd, else false
function isSubPath(a: PropAccess[], b: PropAccess[]): boolean {
    if (a.length > b.length) return false;
    for (let i = 0; i < a.length; ++i) {
        const aItem = a[i];
        const bItem = b[i];
        if (aItem.type !== bItem.type) return false;
        if (aItem.type === 'member' && bItem.type === 'member') {
            if (aItem.member.text !== bItem.member.text) return false;
        }
        if (aItem.type === 'dynamic' && bItem.type === 'dynamic') {
            if (aItem.expr.getText() !== bItem.expr.getText()) return false;
        }
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
    let str = indent + propAccessToStr(nd.name) + ' ';
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
