import * as ts from 'typescript';
import { isPropAccessEqual, parseAccessChain, PropAccess, propAccessToStr } from './prop-access';
import { assertExhaustive, isAssignment, isExpression, strKind, TransformState } from './util';
import { removeLocalVariables } from './remove-locals';
import { createNullishCoallescingOperator, updateForInBody, updateForLoopBody, updateForOfBody } from './ast';

interface BaseMutation {
    statement: ts.Statement;
    accessChain: PropAccess[];
}

interface Assignment extends BaseMutation {
    type: 'assignment';
    token: ts.AssignmentOperatorToken;
    value: ts.Expression;
}

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

    const newStatements = createStatementsForAllBranches(state, params[0].name, removeLocalVariables(state, statements));
    if (!ts.isReturnStatement(newStatements[newStatements.length - 1])) {
        newStatements.push(state.ctx.factory.createReturnStatement(params[0].name));
    }
    return ctx.factory.createArrowFunction(
        [], [], params, undefined,
        ctx.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        ctx.factory.createBlock(newStatements)
    );
}

function createStatementsForAllBranches(state: TransformState, stateParam: ts.Identifier, inputStatements: ts.Statement[]): ts.Statement[] {
    const newStatements: ts.Statement[] = [];
    // Iterate through all statements until we hit a branch, then parse all the queued items in one shot
    var queue: ts.Statement[] = [];
    for (const statement of inputStatements) {
        const { ctx: { factory } } = state;
        if (ts.isReturnStatement(statement)) {
            if (!statement.expression) {
                queue.push(factory.createReturnStatement(stateParam));
            }
            else {
                queue.push(statement);
            }
            break;
        }
        else if (ts.isIfStatement(statement)) {
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
    };
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
    const mutationExtractors = [getAssignmentFromStatement, getArrayOpsFromStatement, getDeleteOpFromStatement, getUnaryOpFromStatement];

    const allMutations = statements
        .flatMap(statement => mutationExtractors.map(extractor => extractor(state, statement)))
        .filter(Boolean) as Mutation[];
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
function getAssignmentFromStatement(state: TransformState, statement: ts.Statement): Mutation | null {
    if (!isAssignment(statement)) return null;

    const binaryExpr = statement.expression;
    const accessChain = parseAccessChain(state, binaryExpr.left);
    return {
        type: 'assignment',
        token: binaryExpr.operatorToken,
        value: binaryExpr.right,
        accessChain, statement
    };
}

function getArrayOpsFromStatement(state: TransformState, statement: ts.Statement): Mutation | null {
    if (!ts.isExpressionStatement(statement)) return null;

    const expression = statement.expression;
    if (!ts.isCallExpression(expression)) return null;
    if (!ts.isPropertyAccessExpression(expression.expression)) return null;
    const propAccessExpr = expression.expression;
    const funcName = propAccessExpr.name.getText();
    if (!supportedArrayOps.includes(funcName)) return null;

    const accessChain = parseAccessChain(state, propAccessExpr);
    accessChain.pop(); // Remove the name of the function
    return {
        type: 'arrayOp',
        addToStart: funcName === 'unshift' ? expression.arguments.map(arg => arg) : [],
        addToEnd: funcName === 'push' ? expression.arguments.map(arg => arg) : [],
        removeFromStart: funcName === 'shift' ? 1 : 0,
        removeFromEnd: funcName === 'pop' ? 1 : 0,
        accessChain,
        statement
    };
}

function getDeleteOpFromStatement(state: TransformState, statement: ts.Statement): Mutation | null {
    if (!ts.isExpressionStatement(statement)) return null;
    const expression = statement.expression;
    if (!ts.isDeleteExpression(expression)) return null;
    return {
        type: 'delete',
        accessChain: parseAccessChain(state, expression.expression),
        statement
    };
}

function getUnaryOpFromStatement(state: TransformState, statement: ts.Statement): Mutation | null {
    if (!ts.isExpressionStatement(statement)) return null;
    const expression = statement.expression;
    if (!ts.isPrefixUnaryExpression(expression) && !ts.isPostfixUnaryExpression(expression)) return null;
    if (expression.operator !== ts.SyntaxKind.PlusPlusToken && expression.operator !== ts.SyntaxKind.MinusMinusToken) return null;

    const { factory } = state.ctx;
    const assignment = (expression.operator === ts.SyntaxKind.PlusPlusToken) ? 
        factory.createAdd(expression.operand, factory.createNumericLiteral(1)) : factory.createSubtract(expression.operand, factory.createNumericLiteral(1));
    return {
        type: 'assignment',
        token: factory.createToken(ts.SyntaxKind.EqualsToken),
        value: assignment,
        accessChain: parseAccessChain(state, expression.operand),
        statement
    };
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
                    path: [...currentNode.path, propAccess]
                }
                if (isLast) {
                    if (mutation.type === 'assignment' && mutation.token.kind !== ts.SyntaxKind.EqualsToken) {
                        mutation = {
                            ...mutation,
                            token: ts.factory.createToken(ts.SyntaxKind.EqualsToken),
                            value: getCreateFunctionForToken(mutation.token)(createChainedPropertyExpr(childNode.path), mutation.value)
                        }
                    }
                    childNode = { ...childNode, mutation };
                }
                currentNode.children.push(childNode);
            }
            else if (isLast && childNode.mutation && mutation) {
                if (childNode.mutation.type === 'arrayOp' && mutation.type === 'arrayOp') {
                    childNode.mutation = mergeArrayOperations(childNode.mutation, mutation);
                }
                else if (childNode.mutation.type === 'assignment' && mutation.type === 'assignment') {
                    childNode.mutation = mergeAssignmentOperations(childNode.mutation, mutation);
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
                                createChainedPropertyExpr(objTree.path)
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
        let exprValue: ts.Expression | undefined;
        if (objTree.mutation?.type === 'assignment') {
            if (objTree.mutation.token.kind !== ts.SyntaxKind.EqualsToken) {
                throw Error('Expected assignment to have been converted to = operator by now. Found: ' + strKind(objTree.mutation.token));
            }
            exprValue = objTree.mutation.value;
            if (!exprValue) throw Error('Unsupported assignment token ' + objTree.mutation.token.kind);
        }
        else if (objTree?.mutation?.type === 'arrayOp') {
            exprValue = ctx.factory.createArrayLiteralExpression([
                ...(objTree.mutation.addToStart),
                ctx.factory.createSpreadElement(
                    (objTree.mutation.removeFromEnd + objTree.mutation.removeFromStart === 0) ?
                        createChainedPropertyExpr(objTree.path)
                        :
                        ctx.factory.createCallExpression(
                            ctx.factory.createPropertyAccessExpression(
                                createChainedPropertyExpr(objTree.path), 'slice'
                            ),
                            [],
                            [
                                ctx.factory.createNumericLiteral(objTree.mutation.removeFromStart),
                                ctx.factory.createSubtract(
                                    ctx.factory.createPropertyAccessExpression(
                                        createChainedPropertyExpr(objTree.path), 'length'
                                    ),
                                    ctx.factory.createNumericLiteral(objTree.mutation.removeFromEnd)
                                )
                            ]
                        )
                ),
                ...(objTree.mutation.addToEnd)
            ]);
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
function createChainedPropertyExpr(accessChain: PropAccess[]): ts.Expression {
    if (accessChain.length === 1) {
        if (accessChain[0].type === 'member') {
            return ts.factory.createIdentifier(accessChain[0].member.text);
        }
        throw Error("Don't believe this is possible...");
    }
    const lastElem = accessChain[accessChain.length - 1];
    if (lastElem.type === 'member') {
        return ts.factory.createPropertyAccessExpression(
            createChainedPropertyExpr(accessChain.slice(0, -1)), lastElem.member.text
        );
    }
    else if (lastElem.type === 'dynamic') {
        return ts.factory.createElementAccessExpression(
            createChainedPropertyExpr(accessChain.slice(0, -1)), lastElem.expr
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
            createChainedPropertyExpr(objTree.path)
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
                    createChainedPropertyExpr(objTree.path)
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

function getCreateFunctionForToken(token: ts.AssignmentOperatorToken) {
    switch (token.kind) {
        case ts.SyntaxKind.PlusEqualsToken: return ts.factory.createAdd;
        case ts.SyntaxKind.MinusEqualsToken: return ts.factory.createSubtract;
        case ts.SyntaxKind.AsteriskEqualsToken: return ts.factory.createMultiply;
        case ts.SyntaxKind.SlashEqualsToken: return ts.factory.createDivide;
        case ts.SyntaxKind.PercentEqualsToken: return ts.factory.createModulo;
        case ts.SyntaxKind.AmpersandEqualsToken: return ts.factory.createBitwiseAnd;
        case ts.SyntaxKind.BarEqualsToken: return ts.factory.createBitwiseOr;
        case ts.SyntaxKind.CaretEqualsToken: return ts.factory.createBitwiseXor;
        case ts.SyntaxKind.BarBarEqualsToken: return ts.factory.createLogicalOr;
        case ts.SyntaxKind.AmpersandAmpersandEqualsToken: return ts.factory.createLogicalAnd;
        case ts.SyntaxKind.AsteriskAsteriskEqualsToken: return ts.factory.createExponent;
        case ts.SyntaxKind.LessThanLessThanEqualsToken: return ts.factory.createLeftShift;
        case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken: return ts.factory.createRightShift;
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken: return ts.factory.createUnsignedRightShift;
        case ts.SyntaxKind.QuestionQuestionEqualsToken: return createNullishCoallescingOperator;
        default: 
            throw Error("No function found for token " + strKind(token));
    };
}

function mergeArrayOperations(first: ArrayOperation, second: ArrayOperation): Mutation {
    let addToEnd: ts.Expression[] = [...first.addToEnd, ...second.addToEnd];
    let addToStart: ts.Expression[] = [...second.addToStart, ...first.addToStart];
    let removeFromEnd: number = first.removeFromEnd + second.removeFromEnd;
    let removeFromStart: number = first.removeFromStart + second.removeFromStart;

    if (second.removeFromEnd && first.addToEnd.length) {
        if (first.addToEnd.length > second.removeFromEnd) {
            removeFromEnd = 0;
            addToEnd = first.addToEnd.slice(0, first.addToEnd.length - second.removeFromEnd);
        }
        else {
            removeFromEnd = second.removeFromEnd - first.addToEnd.length;
            addToEnd = [];
        }
    }
    if (second.removeFromStart && first.addToStart.length) {
        if (first.addToStart.length > second.removeFromStart) {
            removeFromStart = 0;
            addToStart = first.addToStart.slice(second.removeFromStart);
        }
        else {
            removeFromStart = second.removeFromStart - first.addToStart.length;
            addToStart = [];
        }
    }

    return {
        ...first,
        addToEnd,
        addToStart,
        removeFromEnd,
        removeFromStart
    };
}

function mergeAssignmentOperations(first: Assignment, second: Assignment): Mutation {
    if (second.token.kind === ts.SyntaxKind.EqualsToken) {
        return second;
    }
    const create = getCreateFunctionForToken(second.token);
    return {
        ...first,
        token: ts.factory.createToken(ts.SyntaxKind.EqualsToken),
        value: create(ts.factory.createParenthesizedExpression(first.value), second.value)
    }
}
