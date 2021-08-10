import * as ts from 'typescript';
import { isPropAccessEqual, isSubPath, parseAccessChain, PropAccess, propAccessToStr } from './prop-access';
import { assertExhaustive, isExpression, strKind, TransformState } from './util';

interface Assignment {
    type: 'assignment',
    accessChain: PropAccess[];
    value: ts.Expression;
    binaryExpr: ts.BinaryExpression;
}

const supportedArrayOps = ['push', 'pop', 'shift', 'unshift'];
interface ArrayOperation {
    type: 'arrayOp',
    funcName: string,
    accessChain: PropAccess[];
    args: ts.Expression[];
}

interface DeleteOperation {
    type: 'delete',
    accessChain: PropAccess[];
}

type Mutation = Assignment | ArrayOperation | DeleteOperation;

interface ObjTreeNode {
    name: PropAccess,
    path: PropAccess[],
    mutation?: Mutation,
    children: ObjTreeNode[]
}

export default function(program: ts.Program, pluginOptions: object) {
    return (ctx: ts.TransformationContext) => {
        return (sourceFile: ts.SourceFile) => {
            const state: TransformState = {program, pluginOptions, ctx, sourceFile};
            function visitor(node: ts.Node): ts.Node {
                try {
                    // if (sourceFile.fileName.includes('index.ts')) {
                    //     console.log(strKind(node));
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
    const assignments = getAssignmentsInStatements(state, statements);
    checkConflictingAssignments(assignments);
    const arrayOps = getArrayOpsInStatements(state, statements);
    const deleteOps = getDeleteOperations(state, statements);

    const objTree = buildObjTree([...assignments, ...arrayOps, ...deleteOps]);
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
function getAssignmentsInStatements(state: TransformState, statements: ts.Statement[]) {
    const assignments: Assignment[] = [];

    statements.forEach(statement => {
        if (!ts.isExpressionStatement(statement)) return;
        if (!ts.isBinaryExpression(statement.expression)) return;
        const binaryExpr = statement.expression;
        if (binaryExpr.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
        assignments.push({
            type: 'assignment',
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
                    type: 'arrayOp',
                    funcName,
                    args: child.arguments.map(arg => arg),
                    accessChain
                });
            }
        });
    });
    return arrayOps;
}

function getDeleteOperations(state: TransformState, statements: ts.Statement[]) {
    const deletes: DeleteOperation[] = [];
    statements.forEach(statement => {
        if (!ts.isExpressionStatement(statement)) return;
        statement.forEachChild(child => {
            if (!ts.isDeleteExpression(child)) return;
            const propAccessExpr = child.expression;
            deletes.push({
                type: 'delete',
                accessChain: parseAccessChain(state, propAccessExpr)
            });
        });
    });
    return deletes;
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

function buildObjTree(mutations: Mutation[]): ObjTreeNode {
    const root: ObjTreeNode = {
        name: null as any,
        children: [],
        path: []
    };

    mutations.forEach(mutation => {
        let currentNode: ObjTreeNode = root;
        mutation.accessChain.forEach((propAccess, idx) => {
            let childNode = currentNode.children.find(child => isPropAccessEqual(child.name, propAccess));
            const isLast = idx === (mutation.accessChain.length - 1);
            if (!childNode) {
                childNode = {
                    name: propAccess,
                    children: [],
                    path: [...currentNode.path, propAccess],
                    ...(isLast ? { mutation } : {})
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
                                if (child.mutation?.type !== 'assignment') throw Error();
                                return ctx.factory.createPropertyAssignment(
                                    getPropertyName(ctx, child.name),
                                    child.mutation.value
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
                    createObjSpread(state, objTree),
                    ...objTree.children
                        .filter(child => child.mutation?.type !== 'delete')
                        .map(child => convertObjTree(state, child))
                ])
            );
        }
    }
    else {
        let exprValue: ts.Expression | null = null;
        if (objTree.mutation?.type === 'assignment') {
            exprValue = objTree.mutation.value;
        }
        else if (objTree.mutation?.type === 'arrayOp') {
            if (objTree.mutation.funcName === 'push') {
                exprValue = ctx.factory.createArrayLiteralExpression([
                    ctx.factory.createSpreadElement(
                        createChainedPropertyExpr(ctx, objTree.path)
                    ),
                    ...objTree.mutation.args
                ]);
            }
            else if (objTree.mutation.funcName === 'pop') {
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
            else if (objTree.mutation.funcName === 'shift') {
                exprValue = ctx.factory.createCallExpression(
                    ctx.factory.createPropertyAccessExpression(
                        createChainedPropertyExpr(ctx, objTree.path), 'slice'
                    ),
                    [],
                    [ctx.factory.createNumericLiteral(1)]
                );
            }
            else if (objTree.mutation.funcName === 'unshift') {
                exprValue = ctx.factory.createArrayLiteralExpression([
                    ...objTree.mutation.args,
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
    return assertExhaustive(propAccess);
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
    return assertExhaustive(lastElem);
}

function printObjTree(nd: ObjTreeNode, indent: string = '') {
    let str = indent + propAccessToStr(nd.name) + ' ';
    if (nd.mutation?.type === 'assignment') {
        str += nd.mutation.value.getText();
    }
    else if (nd.mutation?.type === 'arrayOp') {
        str += (nd.mutation.funcName + '(' + nd.mutation.args.map(arg => arg.getText()).join() + ')');
    }
    else if (nd.mutation?.type === 'delete') {
        str += 'DELETE';
    }
    console.log(str);

    nd.children.forEach(child => printObjTree(child, indent + '    '));
}

function createObjSpread(state: TransformState, objTree: ObjTreeNode) {
    const { ctx } = state;
    const deletes = objTree.children.filter(child => child.children.length === 0 && child.mutation?.type === 'delete');
    if (deletes.length === 0) {
        return ctx.factory.createSpreadAssignment(
            createChainedPropertyExpr(ctx, objTree.path)
        );
    }
    else {
        const block = ctx.factory.createBlock([
            ctx.factory.createVariableStatement([], [
                ctx.factory.createVariableDeclaration(
                    ctx.factory.createObjectBindingPattern([
                        ...deletes.map((aDelete, idx) => ctx.factory.createBindingElement(
                            undefined,
                            getPropertyName(ctx, aDelete.name),
                            '__deleted' + idx
                        )),
                        ctx.factory.createBindingElement(
                            ctx.factory.createToken(ts.SyntaxKind.DotDotDotToken),
                            undefined, 'rest'
                        )
                    ]),
                    undefined, undefined,
                    createChainedPropertyExpr(ctx, objTree.path)
                )
            ]),
            ctx.factory.createReturnStatement(ctx.factory.createIdentifier('rest'))
        ]);

        return ctx.factory.createSpreadAssignment(
            ctx.factory.createCallExpression(
                ctx.factory.createArrowFunction(
                    [], [], [], undefined,
                    ctx.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                    block
                ),
                [], []
            )
        );
    }
}
