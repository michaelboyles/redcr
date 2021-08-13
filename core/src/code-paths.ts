import * as ts from 'typescript';
import { strKind, TransformState } from './util';

// ================================================================================================
// This file contains functions and types related to analyzing code paths: branching conditions 
// like if and else.
// ================================================================================================

export interface CodePath {
    condition: ts.Expression | null; // Null means unconditional
    statements: ts.Statement[];
}

export function parseCodePaths(state: TransformState, statements: ts.Statement[]) {
    const paths: CodePath[] = [];
    parseCodePathsImpl(state, statements, null, paths);
    return paths;
}

function parseCodePathsImpl(state: TransformState, statements: ts.Statement[], condition: ts.Expression | null, paths: CodePath[]): void {
    const hasIf = statements.some(statement => ts.isIfStatement(statement));
    if (hasIf) {
        statements.forEach((statement, idx) => {
            if (ts.isIfStatement(statement)) {
                const beforeStatements = statements.filter((s2, i2) => i2 < idx && !ts.isIfStatement(s2));
                const afterStatement = statements.filter((s2, i2) => i2 > idx && !ts.isIfStatement(s2));

                const ifCondition = condition ? state.ctx.factory.createLogicalAnd(condition, statement.expression) : statement.expression;
                const ifStatements = explodeBlocks([...beforeStatements, statement.thenStatement, ...afterStatement]);
                parseCodePathsImpl(state, ifStatements, ifCondition, paths);

                const negatedIf = state.ctx.factory.createLogicalNot(statement.expression);
                const elseCondition = condition ? state.ctx.factory.createLogicalAnd(condition, negatedIf) : negatedIf;
                const elseStatements = statement.elseStatement ?
                      [...beforeStatements, statement.elseStatement, ...afterStatement]
                    : [...beforeStatements, ...afterStatement];
                parseCodePathsImpl(state, explodeBlocks(elseStatements), elseCondition, paths);
            }
        })
    }
    else {
        paths.push({ condition, statements });
    }
}

function explodeBlocks(statements: ts.Statement[]): ts.Statement[] {
    const ret: ts.Statement[] = [];
     statements.forEach(statement => {
        if (ts.isBlock(statement)) {
            explodeBlocks(statement.statements.map(i => i)).forEach(st => ret.push(st));
        }
        else {
            ret.push(statement);
        }
    });
    return ret;
}

export function printCodePath(path: CodePath) {
    console.log('Statements: ', path.statements.map(sta => sta.getText() + ' ' + strKind(sta)));
}
