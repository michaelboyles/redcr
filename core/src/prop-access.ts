import * as ts from 'typescript';
import { strKind, TransformState } from './util';

// ================================================================================================
// This file contains functions and types related to accessing properties of objects.
// ================================================================================================

export interface SharedPropAccess {
    exprType: ts.Type;
}

export interface MemberPropAccess extends SharedPropAccess {
    type: 'member',
    member: ts.MemberName;
}
export function memberPropAccess(member: ts.MemberName, exprType: ts.Type): MemberPropAccess {
    return {type: 'member', member, exprType};
}

export interface DynamicPropAccess extends SharedPropAccess {
    type: 'dynamic',
    expr: ts.Expression;
}
export function dynamicPropAccess(expr: ts.Expression, exprType: ts.Type): DynamicPropAccess {
    return {type: 'dynamic', expr, exprType};
}

export type PropAccess = MemberPropAccess | DynamicPropAccess;

export function propAccessToStr(propAccess: PropAccess) {
    if (!propAccess) return '';
    if (propAccess.type === 'member') {
        return propAccess.member.text;
    }
    else if (propAccess.type === 'dynamic') {
        return '[' + propAccess.expr.getText() + ']';
    }
}

export function isPropAccessEqual(one: PropAccess, two: PropAccess) {
    if (one.type === 'member' && two.type === 'member') {
        return one.member.getText() === two.member.getText();
    }
    else if (one.type === 'dynamic' && two.type === 'dynamic') {
        return one.expr.getText() === two.expr.getText(); // TODO Probably not good to compare text...
    }
    return false;
}

// Recursively parse an expression into its sub-expressions to build an access chain.
export function parseAccessChain(state: TransformState, initExpr: ts.Expression) {
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
            throw new Error('Unhandled syntax kind ' + strKind(expr))
        }
    }
    return accessChain;
}
