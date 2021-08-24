import * as ts from 'typescript';
import { assertExhaustive, isAssignment, TransformState } from './util';

// ================================================================================================
// This file exports a function used for removing local variables from a given set of statements.
// ================================================================================================

// A map holding variable identifier to the expression which represents its value at a given point in time
type Stack = Record<string, ts.Expression>;

// Process statements in sequence, work out the current state of the stack, and erase local variables
export function removeLocalVariables(state: TransformState, statements: ts.Statement[]): ts.Statement[] {
    const stack: Stack = {};
    const newStatements: ts.Statement[] = [];
    statements.forEach(statement => {
        if (ts.isVariableStatement(statement)) {
            handleVariableDeclaration(state, statement, stack);
        }
        else if (isAssignment(statement) && ts.isIdentifier(statement.expression.left)) {
            stack[statement.expression.left.text] = statement.expression.right;
        }
        else {
            const visitor = (node: ts.Node): ts.Node => {
                // TODO 
                // if (ts.isPropertyAccessExpression(node)) {
                //     return node;
                // }
                if (ts.isIdentifier(node)) {
                    const val = stack[node.text];
                    if (!val) return node; // Must be a free variable
                    return val;
                }
                return ts.visitEachChild(node, visitor, state.ctx);
            }
            newStatements.push(ts.visitEachChild(statement, visitor, state.ctx));
        }
    });
    return newStatements;
}

// Parse a variable declaration and update the given stack 
function handleVariableDeclaration(state: TransformState, statement: ts.VariableStatement, stack: Stack) {
    statement.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
            stack[decl.name.text] = decl.initializer ?? ts.factory.createIdentifier('undefined');
        }
        else {
            if (!decl.initializer) {
                throw Error("Destructure without initializer?");
            }
            handleDestructuring(state, decl.name, decl.initializer, stack);
        }
    });
}

// Handle destructuring and update the given stack
function handleDestructuring(state: TransformState, name: ts.BindingName, expr: ts.Expression, stack: Stack) {
    if (ts.isObjectBindingPattern(name)) {
        name.elements.forEach(elem => {
            if (elem.propertyName) {
                handleDestructuring(
                    state, elem.name,
                    propNameToAccessExpr(state, expr, elem.propertyName),
                    stack
                );
            }
            else {
                if (ts.isIdentifier(elem.name)) {
                    handleDestructuring(
                        state, elem.name,
                        state.ctx.factory.createPropertyAccessExpression(expr, elem.name),
                        stack
                    );
                }
                else {
                    // TODO
                    throw Error("Not sure if this is possible? 222");
                }
            }
        });
    }
    else if (ts.isIdentifier(name)) {
        stack[name.text] = expr;
    }
}

function propNameToAccessExpr(state: TransformState, expr: ts.Expression, propName: ts.PropertyName): ts.Expression {
    if (ts.isMemberName(propName)) {
        return state.ctx.factory.createPropertyAccessExpression(expr, propName);
    }
    else if (ts.isStringLiteral(propName) || ts.isNumericLiteral(propName)) {
        return state.ctx.factory.createElementAccessExpression(expr, propName);
    }
    else if (ts.isComputedPropertyName(propName)) {
        return state.ctx.factory.createElementAccessExpression(expr, propName.expression);
    }
    return assertExhaustive(propName);
}
