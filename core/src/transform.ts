import * as ts from 'typescript';
import { isPropAccessEqual, parseAccessChain, PropAccess, propAccessToStr } from './prop-access';
import { assertExhaustive, isAssignment, isExpression, strKind, TransformState } from './util';
import { removeLocalVariables } from './remove-locals';
import { updateForInBody, updateForLoopBody, updateForOfBody } from './ast';

interface BaseMutation {
    statement: ts.Statement;
    accessChain: PropAccess[];
}

interface Assignment extends BaseMutation {
    type: 'assignment',
    value: ts.Expression;
    binaryExpr: ts.BinaryExpression;
}

interface StringConcat extends BaseMutation {
    type: 'stringConcat',
    value: ts.Expression;
    binaryExpr: ts.BinaryExpression;
}

// Prefix vs postfix doesn't matter to us
interface UnaryOperation extends BaseMutation {
    type: 'unary';
    subType: 'increment' | 'decrement';
};

const supportedArrayOps = ['push', 'pop', 'shift', 'unshift'];
interface ArrayOperation extends BaseMutation {
    type: 'arrayOp',
    addToStart: ts.Expression[],
    addToEnd: ts.Expression[]
    removeFromStart: number,
    removeFromEnd: number
}

interface DeleteOperation extends BaseMutation {
    type: 'delete'
}

type Mutation = Assignment | StringConcat | ArrayOperation | DeleteOperation | UnaryOperation;

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
                    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
                        if (node.moduleSpecifier.text === 'redcr') {
                            return null as any;
                        }
                    }
                    else if (ts.isCallExpression(node)) {
                        if (ts.isIdentifier(node.expression)) {
                            if (node.expression.text === 'redcr') {
                                if (node.arguments.length !== 1) {
                                    throw new Error("redcr must be given precisely 1 argument, found: " + node.arguments.length);
                                }
                                const reducer = node.arguments[0];
                                if (!ts.isArrowFunction(reducer) && !ts.isFunctionExpression(reducer)) {
                                    throw Error("redcr must be given a function, got " + strKind(reducer));   
                                }
                                const params = reducer.parameters.map(i => i);
                                if (ts.isBlock(reducer.body)) {
                                    reducer.parameters
                                    return replaceReducer(
                                        state, params,
                                        reducer.body.statements.map(i => i)
                                    );
                                }
                                else if (isExpression(reducer.body)) {
                                    return replaceReducer(
                                        state, params,
                                        [ctx.factory.createExpressionStatement(reducer.body)]
                                    );
                                }
                                return assertExhaustive(reducer.body);
                            }
                        }    
                    }
                    return ts.visitEachChild(node, visitor, ctx);
                }
                catch (err: any) {
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

    if (!ts.isIdentifier(params[0].name)) {
        throw new Error("Can't use destructuring here");
    }

    return ctx.factory.createArrowFunction(
        [],
        [],
        params,
        undefined,
        ctx.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        ctx.factory.createBlock([
            ...createStatementsForAllBranches(state, params[0].name, removeLocalVariables(state, statements)),
            state.ctx.factory.createReturnStatement(params[0].name)
        ])
    );
}

function createStatementsForAllBranches(state: TransformState, stateParam: ts.Identifier, inputStatements: ts.Statement[]): ts.Statement[] {
    const newStatements: ts.Statement[] = [];
    // Iterate through all statements until we hit a branch, then parse all the queued items in one shot
    var queue: ts.Statement[] = [];
    inputStatements.forEach(statement => {
        const { ctx: { factory } } = state;
        if (ts.isIfStatement(statement)) {
            createStatementsForBranch(state, stateParam, queue).forEach(st => newStatements.push(st));
            queue = [];

            const thenStatements = getStatementsFromPossibleBlock(statement.thenStatement);
            const elseStatements = (!statement.elseStatement) ? [] : getStatementsFromPossibleBlock(statement.elseStatement);
            newStatements.push(
                factory.createIfStatement(
                    statement.expression,
                    factory.createBlock(createStatementsForAllBranches(state, stateParam, thenStatements)),
                    elseStatements.length == 0 ? undefined : factory.createBlock(createStatementsForAllBranches(state, stateParam, elseStatements))
                )
            );
        }
        else if (ts.isSwitchStatement(statement)) {
            newStatements.push(
                factory.createSwitchStatement(
                    statement.expression,
                    factory.createCaseBlock(
                        statement.caseBlock.clauses.map(clause => {
                            const originalStatements: ts.Statement[] = [];
                            let hasBreak: boolean = false;
                            for (const statement of clause.statements) {
                                if (ts.isBreakStatement(statement)) {
                                    hasBreak = true;
                                    break;
                                }
                                originalStatements.push(statement);
                            }
                            const newStatements = createStatementsForAllBranches(state, stateParam, originalStatements);
                            if (ts.isCaseClause(clause)) {
                                if (hasBreak) {
                                    newStatements.push(factory.createBreakStatement());
                                }
                                return factory.createCaseClause(clause.expression, newStatements);
                            }
                            else if (ts.isDefaultClause(clause)) {
                                return factory.createDefaultClause(newStatements);
                            }
                            return assertExhaustive(clause);
                        })
                    )
                )
            );
        }
        else if (ts.isForStatement(statement)) {
            createStatementsForBranch(state, stateParam, queue).forEach(st => newStatements.push(st));
            queue = [];

            newStatements.push(
                updateForLoopBody(
                    factory, statement,
                    factory.createBlock(createStatementsForAllBranches(state, stateParam, getStatementsFromPossibleBlock(statement.statement)))
                )
            );
        }
        else if (ts.isForInStatement(statement)) {
            createStatementsForBranch(state, stateParam, queue).forEach(st => newStatements.push(st));
            queue = [];

            newStatements.push(
                updateForInBody(
                    factory, statement,
                    factory.createBlock(createStatementsForAllBranches(state, stateParam, getStatementsFromPossibleBlock(statement.statement)))
                )
            );
        }
        else if (ts.isForOfStatement(statement)) {
            createStatementsForBranch(state, stateParam, queue).forEach(st => newStatements.push(st));
            queue = [];

            newStatements.push(
                updateForOfBody(
                    factory, statement,
                    factory.createBlock(createStatementsForAllBranches(state, stateParam, getStatementsFromPossibleBlock(statement.statement)))
                )
            );
        }
        else {
            queue.push(statement);
        }
    });
    if (queue.length > 0) {
        createStatementsForBranch(state, stateParam, queue).forEach(st => newStatements.push(st));
    }
    return newStatements;
}

function getStatementsFromPossibleBlock(statement: ts.Statement): ts.Statement[] {
    if (ts.isBlock(statement)) {
        return statement.statements.map(x => x)
    }
    return [statement];
}

function createStatementsForBranch(state: TransformState, stateParam: ts.Identifier, statements: ts.Statement[]): ts.Statement[] {
    const assignments = getAssignmentsInStatements(state, statements);
    const arrayOps = getArrayOpsInStatements(state, statements);
    const deleteOps = getDeleteOperations(state, statements);
    const unaryOps = getUnaryOperations(state, statements);

    const allMutations = [...assignments, ...arrayOps, ...deleteOps, ...unaryOps];
    const objTree = buildObjTree(allMutations);
    //printObjTree(objTree);
    const targetNode = objTree.children.find(child => child.name.type === 'member' && child.name.member.text === stateParam.getText());

    const nonMutationStatements = statements.filter(statement =>
        !allMutations.map(mutation => mutation.statement).includes(statement)
    );
    
    if (!targetNode) {
        return nonMutationStatements;
    }
    return [
        state.ctx.factory.createExpressionStatement(
            state.ctx.factory.createAssignment(
                stateParam,
                convertObjTree(state, targetNode).initializer
            )
        ),
        ...nonMutationStatements
    ];
}

// Get all the binary expressions which represent assignments within the given statements
function getAssignmentsInStatements(state: TransformState, statements: ts.Statement[]) {
    const assignments: Mutation[] = [];

    statements.forEach(statement => {
        if (isAssignment(statement)) {
            const binaryExpr = statement.expression;
            const accessChain = parseAccessChain(state, binaryExpr.left);
            const type = binaryExpr.operatorToken.kind === ts.SyntaxKind.EqualsToken ? 'assignment' : 'stringConcat';
            assignments.push({
                type,
                value: binaryExpr.right,
                binaryExpr, accessChain, statement
            });
        }
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
                    addToStart: funcName === 'unshift' ? child.arguments.map(arg => arg) : [],
                    addToEnd: funcName === 'push' ? child.arguments.map(arg => arg) : [],
                    removeFromStart: funcName === 'shift' ? 1 : 0,
                    removeFromEnd: funcName === 'pop' ? 1 : 0,
                    accessChain,
                    statement
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
                accessChain: parseAccessChain(state, propAccessExpr),
                statement
            });
        });
    });
    return deletes;
}

function getUnaryOperations(state: TransformState, statements: ts.Statement[]) {
    const unaryOps: UnaryOperation[] = [];
    statements.forEach(statement => {
        if (!ts.isExpressionStatement(statement)) return;
        statement.forEachChild(child => {
            if (ts.isPrefixUnaryExpression(child) || ts.isPostfixUnaryExpression(child)) {
                let subType: 'increment' | 'decrement';
                if (child.operator === ts.SyntaxKind.PlusPlusToken) {
                    subType = 'increment';
                }
                else if (child.operator === ts.SyntaxKind.MinusMinusToken) {
                    subType = 'decrement';
                }
                else {
                    throw new Error('Unsupported unary operator ' + child.operator);
                }

                unaryOps.push({
                    type: 'unary',
                    subType,
                    accessChain: parseAccessChain(state, child.operand),
                    statement
                })
            }
        });
    });
    return unaryOps;
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
            else if (isLast) {
                if (isArrayOperation(childNode.mutation) && isArrayOperation(mutation)) {
                    childNode.mutation = mergeArrayOperations(childNode.mutation, mutation);
                }
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
                            objTree.children.map(child => convertObjTree(state, child))
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
        else if (objTree.mutation?.type === 'stringConcat') {
            exprValue = ts.factory.createAdd(
                createChainedPropertyExpr(ctx, objTree.path),
                objTree.mutation.value
            );
        }
        else if (isArrayOperation(objTree?.mutation)) {
            exprValue = ctx.factory.createArrayLiteralExpression([
                ...(objTree.mutation.addToStart),
                ctx.factory.createSpreadElement(
                    (objTree.mutation.removeFromEnd + objTree.mutation.removeFromStart === 0) ?
                        createChainedPropertyExpr(ctx, objTree.path)
                        :
                        ctx.factory.createCallExpression(
                            ctx.factory.createPropertyAccessExpression(
                                createChainedPropertyExpr(ctx, objTree.path), 'slice'
                            ),
                            [],
                            [
                                ctx.factory.createNumericLiteral(objTree.mutation.removeFromStart),
                                ctx.factory.createSubtract(
                                    ctx.factory.createPropertyAccessExpression(
                                        createChainedPropertyExpr(ctx, objTree.path), 'length'
                                    ),
                                    ctx.factory.createNumericLiteral(objTree.mutation.removeFromEnd)
                                )
                            ]
                        )
                ),
                ...(objTree.mutation.addToEnd)
            ]);
        }
        else if (objTree.mutation?.type === 'unary') {
            if (objTree.mutation.subType === 'increment') {
                exprValue = ts.factory.createAdd(
                    createChainedPropertyExpr(ctx, objTree.path),
                    ctx.factory.createNumericLiteral(1)
                );
            }
            else if (objTree.mutation.subType === 'decrement') {
                exprValue = ts.factory.createSubtract(
                    createChainedPropertyExpr(ctx, objTree.path),
                    ctx.factory.createNumericLiteral(1)
                );
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
    if (nd.path.length === 0) {
        str = 'Object tree:';
    }
    else if (nd.mutation?.type === 'assignment') {
        str += nd.mutation.value.getText();
    }
    else if (nd.mutation?.type === 'arrayOp') {
        str += `${nd.mutation.addToStart.length} items added to start, ${nd.mutation.addToEnd.length} items added to end, `;
        str += `${nd.mutation.removeFromStart} items removed from start, ${nd.mutation.removeFromEnd} items removed from end`
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

function isArrayOperation(mutation?: Mutation): mutation is ArrayOperation {
    return mutation?.type === 'arrayOp';
}

function mergeArrayOperations(first: ArrayOperation, second: ArrayOperation): Mutation {
    let addToEnd: ts.Expression[] = [...first.addToEnd, ...second.addToEnd];
    let addToStart: ts.Expression[] = [...second.addToStart, ...first.addToStart];
    let removeFromEnd: number = first.removeFromEnd + second.removeFromEnd;
    let removeFromStart: number = first.removeFromStart + second.removeFromStart;

    if (second.removeFromEnd && first.addToEnd.length) {
        const diff = second.removeFromEnd - first.addToEnd.length;
        addToEnd = first.addToEnd.slice(0, Math.max(0, diff));
        removeFromEnd = first.removeFromEnd + Math.abs(diff);
    }
    if (second.removeFromStart && first.addToStart.length) {
        const diff = second.removeFromStart - first.addToStart.length;
        addToStart = first.addToStart.slice(0, Math.max(0, diff));
        removeFromStart = first.removeFromStart + Math.abs(diff);
    }

    return {
        ...first,
        addToEnd,
        addToStart,
        removeFromEnd,
        removeFromStart
    };
}
