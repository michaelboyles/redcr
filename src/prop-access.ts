import * as ts from 'typescript';

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
