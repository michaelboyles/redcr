import { redcr, Reducer } from "..";

interface StringState {
    str: string
}
type OptionalStringState = Partial<StringState>;
interface NullableStringState {
    str: string | null;
}

interface NumberState {
    num: number,
}
interface TwoNumberState {
    first: number,
    second: number
}
type TwoOptionalNumberState = Partial<TwoNumberState>;
interface NumberArrayState {
    arr: number[]
}
interface StringArrayState {
    arr: string[]
}
interface NestedObjectState {
    child: { str: string }
}
interface DoubleNestedObjectState {
    one: {
        two: { str: string }
    }
}

function testReducer<T>(reducer: Reducer<T, any>, oldState: T, newExpectedState: T) {
    const oldStateCopy = Object.freeze({...oldState});
    const newState = reducer(oldState, undefined) as unknown as T;
    expect(newState).toEqual(newExpectedState);
    expect(oldState).toEqual(oldStateCopy);
}

describe('Redcr invocations', () => {
    test('Reducer with action', () => {
        interface Action {
            bar: string;
        }
        const reducer = redcr((state: StringState, action: Action) => state.str = action.bar);
    
        const oldState: StringState = {str: 'old'};
        const newState = reducer(oldState, {bar: 'new'});
    
        expect(newState).toEqual({str: 'new'});
        expect(oldState).toEqual({str: 'old'});
    });

    test('Arrow function with expression body', () => {
        const reducer = redcr((state: StringState) => state.str = 'new');
        testReducer(reducer, {str: 'old'}, {str: 'new'});
    });

    test('Reducer is an anonymous function', () => {
        const reducer = redcr(function(state: OptionalStringState) {
            state.str = 'new';
        });
        testReducer(reducer, {}, {str: 'new'});
    });    
});

describe('Arrays', () => {
    describe('Mutable array functions', () => {
        test('Array push', () => {
            interface State {
                arr: number[]
            }
            const reducer = redcr((state: State) => {
                state.arr.push(1, 2, 3);
            });
            testReducer(reducer, {arr: [0]}, {arr: [0, 1, 2, 3]});
        });
        
        test('Array pop', () => {
            const reducer = redcr((state: NumberArrayState) => {
                state.arr.pop();
            });
            testReducer(reducer, {arr: [0, 1, 2]}, {arr: [0, 1]});
        });
        
        test('Array pop as expression arrow function', () => {
            const reducer = redcr((state: NumberArrayState) => state.arr.pop());
            testReducer(reducer, {arr: [0, 1, 2]}, {arr: [0, 1]});
        });
        
        test('Array shift', () => {
            const reducer = redcr((state: NumberArrayState) => {
                state.arr.shift();
            });
            testReducer(reducer, {arr: [0, 1, 2]}, {arr: [1, 2]});
        });
        
        test('Array unshift', () => {
            const reducer = redcr((state: NumberArrayState) => {
                state.arr.unshift(0, 1);
            });
            testReducer(reducer, {arr: [2, 3]}, {arr: [0, 1, 2, 3]});
        });

        test('Array operation on array element', () => {
            interface State {
                arr: string[][];
            }

            const reducer = redcr((state: State) => {
                state.arr[1].push('d');
            });
            testReducer(
                reducer,
                { arr: [['a', 'b'], ['c']] },
                { arr: [['a', 'b'], ['c', 'd']]}
            );
        });

        describe('Combinations', () => {
            test('Consecutive array pushes', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.push(2, 3);
                    state.arr.push(4);
                });
                testReducer(reducer, { arr: [1] }, { arr: [1, 2, 3, 4] });
            });
            
            test('Consecutive array pops', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.pop();
                    state.arr.pop();
                });
                testReducer(reducer, { arr: [1, 2, 3] }, { arr: [1] });
            });
            
            test('Consecutive array shifts', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.shift();
                    state.arr.shift();
                });
                testReducer(reducer, { arr: [1, 2, 3] }, { arr: [3] });
            });
            
            test('Consecutive array unshifts', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.unshift(2, 3);
                    state.arr.unshift(1);
                });
                testReducer(reducer, { arr: [4] }, { arr: [1, 2, 3, 4] });
            });
            
            test('Array unshift then array push', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.unshift(1);
                    state.arr.push(3);
                });
                testReducer(reducer, { arr: [2] }, { arr: [1, 2, 3] });
            });
            
            test('Array shift then array pop', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.shift();
                    state.arr.pop();
                });
                testReducer(reducer, { arr: [1, 2, 3] }, { arr: [2] });
            });
            
            test('Inverse operations result in no-op, appending to end', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.push(4);
                    state.arr.pop();
                });
                testReducer(reducer, { arr: [1, 2, 3] }, { arr: [1, 2, 3] });
            });
            
            test('Inverse operations result in no-op, appending to start', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.unshift(1);
                    state.arr.shift();
                });
                testReducer(reducer, { arr: [2, 3, 4] }, { arr: [2, 3, 4] });
            });
            
            test('Pushing multiple elements then popping partially undoes the push', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.push(4, 5);
                    state.arr.pop();
                });
                testReducer(reducer, { arr: [1, 2, 3] }, { arr: [1, 2, 3, 4] });
            });
            
            test('Unshifting multiple elements then shifting partially undoes the unshift', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.unshift(1, 2, 3);
                    state.arr.shift();
                });
                testReducer(reducer, { arr: [4, 5] }, { arr: [2, 3, 4, 5] });
            });
        });
    });

    describe('Access by index', () => {
        test('Assign to arbitary array index', () => {
            const reducer = redcr((state: NumberArrayState) => state.arr[1] = 999);
            testReducer(reducer, {arr: [0, 1, 2]}, {arr: [0, 999, 2]});
        });
        
        test('Assign to multiple array indices', () => {
            interface OptionalNumberArrayState {
                arr: (number | undefined)[];
            }

            const reducer = redcr((state: OptionalNumberArrayState) => {
                state.arr[1] = 888;
                state.arr[6] = 999;
            });
            testReducer(reducer, {arr: [0, 1, 2]}, {arr: [0, 888, 2, , , , 999]});
        });        
    });
});

describe('Delete operator', () => {
    test('Delete field', () => {
        const reducer = redcr((state: OptionalStringState) => delete state.str);
        testReducer(reducer, {str: 'old'}, {});
    });
    
    test('Dynamic field delete', () => {
        const reducer = redcr((state: OptionalStringState) => delete state['str']);
        testReducer(reducer, {str: 'old'}, {});
    });
    
    test('Delete two properties of object', () => {
        const reducer = redcr((state: TwoOptionalNumberState) => {
            delete state.first;
            delete state.second;
        });
        testReducer(reducer, { first: 1, second: 2 }, {});
    });
    
    test('Delete two properties of object dynamically', () => {
        const reducer = redcr((state: TwoOptionalNumberState) => {
            delete state['first'];
            delete state['second'];
        });
        testReducer(reducer, { first: 1, second: 2 }, {});
    });
});

describe('Conditions', () => {
    describe('If statements', () => {
        test('Conditional assignment is true', () => {
            const reducer = redcr((state: OptionalStringState, value: number) => {
                if (value < 1000) {
                    state.str = 'condition was true'
                }
            });
        
            const oldState: OptionalStringState = {};
            const newState = reducer(oldState, 50);
        
            expect(newState).toEqual({str: 'condition was true'});
            expect(oldState).toEqual({});
        });
        
        test('Conditional assignment is false', () => {
            const reducer = redcr((state: OptionalStringState, value: number) => {
                if (value < 1000) {
                    state.str = 'condition was true'
                }
            });
        
            const oldState: OptionalStringState = {};
            const newState = reducer(oldState, 2000);
        
            expect(newState).toEqual({});
            expect(oldState).toEqual({});
        });
        
        test('Conditional assignment without braces', () => {
            const reducer = redcr((state: StringState, value: number) => {
                if (value < 1000) state.str = 'new';
            });
        
            const oldState: StringState = {str: 'old'};
            const newState = reducer(oldState, 500);
        
            expect(newState).toEqual({str: 'new'});
            expect(oldState).toEqual({str: 'old'});
        });
        
        test('Else clause assignment', () => {
            const reducer = redcr((state: OptionalStringState, value: number) => {
                if (value < 1000) {
                    state.str = 'condition was true'
                }
                else {
                    state.str = 'condition was false'
                }
            });
        
            const oldState: OptionalStringState = {};
            const newState = reducer(oldState, 2000);
        
            expect(newState).toEqual({str: 'condition was false'});
            expect(oldState).toEqual({});
        });

        test('Nested if statements using assignment', () => {
            const foo = false;
            const bar = false;
        
            const reducer = redcr((state: OptionalStringState) => {
                if (foo) {
                    if (bar) {
                        state.str = 'both conditions were true'
                    }
                }
                else {
                    state.str = 'condition was false'
                }
            });
            testReducer(reducer, {}, {str: 'condition was false'});
        });
        
        test('Assignment inside and outside of if', () => {
            const condition = true;
        
            const reducer = redcr((state: TwoNumberState) => {
                state.first = 333;
                if (condition) {
                    state.second = 444;
                }
            });
            testReducer(reducer, {first: 111, second: 222}, {first: 333, second: 444});
        });

        test('Local variable used in condition', () => {
            const reducer = redcr((state: StringState) => {
                const condition = true;
                if (condition) {
                    state.str = 'new';
                }
            });
            testReducer(reducer, { str: 'old' }, { str: 'new' });
        });
    });

    describe('Switch statements', () => {
        test('Switch', () => {
            const reducer = redcr((state: StringState) => {
                const value: number = 1;
                switch (value) {
                    case 1:
                        state.str = 'one';
                        break;
                    case 2: 
                        state.str = 'two';
                        break;
                }
            });
            testReducer(reducer, { str: 'old' }, { str: 'one' });
        });
        
        test('Switch with fallthrough', () => {
            const reducer = redcr((state: StringState) => {
                const value: number = 1;
                switch (value) {
                    case 1:
                    case 2: 
                        state.str = 'one or two';
                        break;
                }
            });
            testReducer(reducer, { str: 'old' }, { str: 'one or two' });
        });
        
        test('Switch with default', () => {
            const reducer = redcr((state: StringState) => {
                const value: number = 99;
                switch (value) {
                    case 1:
                        state.str = 'one';
                        break;
                    default:
                        state.str = 'not one'
                }
            });
            testReducer(reducer, { str: 'old' }, { str: 'not one' });
        });
        
        test('Switch with an if-statement containing a break statement', () => {
            const reducer = redcr((state: StringState) => {
                const value1: number = 1;
                const value2: number = 99;
                switch (value1) {
                    case 1:
                        state.str += 'aaa';
                        if (value2 > 5) {
                            state.str += 'bbb';
                            break;
                        }
                        state.str += 'ccc';
                    case 2:
                        state.str += 'ddd';
                        break;
                    default:
                        state.str = 'not one or two'
                }
            });
            testReducer(reducer, { str: '' }, { str: 'aaabbb' });
        });
    });
});

describe('Destructuring', () => {
    test('Destructured assignment', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const { child } = state;
            child.str = 'new';
        });
        testReducer(reducer, { child: { str: 'old' } }, { child: { str: 'new' } });
    });
    
    test('Destructured assignment with different identifier', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const { child: foo } = state;
            foo.str = 'new';
        });
        testReducer(reducer, { child: { str: 'old' } }, { child: { str: 'new' } });
    });
    
    test('Two levels of destructuring with assignment', () => {
        const reducer = redcr((state: DoubleNestedObjectState) => {
            const { one: { two } } = state;
            two.str = 'new';
        });
        testReducer(
            reducer,
            { one: { two: { str: 'old' } } },
            { one: { two: { str: 'new' } } }
        );
    });
    
    test('Two levels of destructuring with assignment and alternate identifier', () => {
        const reducer = redcr((state: DoubleNestedObjectState) => {
            const { one: { two: foo } } = state;
            foo.str = 'new';
        });
        testReducer(
            reducer,
            { one: { two: { str: 'old' } } },
            { one: { two: { str: 'new' } } }
        );
    });
    
    test('Destructured assignment with string literal', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const { 'child': foo } = state;
            foo.str = 'new';
        });
        testReducer(
            reducer,
            { child: { str: 'old' } },
            { child: { str: 'new' } }
        );
    });
    
    test('Destructured assignment with number literal', () => {
        interface State {
            123: { str: string }
        }
    
        const reducer = redcr((state: State) => {
            const { 123: foo } = state;
            foo.str = 'new';
        });
        testReducer(reducer, { 123: { str: 'old' } }, { 123: { str: 'new' } });
    });
    
    test('Destructured assignment with computed property', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const { ['child']: foo } = state;
            foo.str = 'new';
        });
        testReducer(reducer, { child: { str: 'old' } }, { child: { str: 'new' } });
    });
    
    test('Destructured assignment with computed property referencing variable', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const field = 'child';
            const { [field]: foo } = state;
            foo.str = 'new';
        });
        testReducer(reducer, { child: { str: 'old' } }, { child: { str: 'new' } });
    });
});

describe('Unary operators', () => {
    describe('Prefix', () => {
        test('Prefix increment number as expression arrow function', () => {
            const reducer = redcr((state: NumberState) => ++state.num);
            testReducer(reducer, { num: 1 }, { num: 2 });
        });
        
        test('Prefix increment number as block arrow function', () => {
            const reducer = redcr((state: NumberState) => {
                ++state.num
            });
            testReducer(reducer, { num: 1 }, { num: 2 });
        });
        
        test('Prefix decrement number', () => {
            const reducer = redcr((state: NumberState) => --state.num);
            testReducer(reducer, { num: 2 }, { num: 1 });
        });
    });

    describe('Postfix', () => {
        test('Postfix increment number', () => {
            const reducer = redcr((state: NumberState) => state.num++);
            testReducer(reducer, { num: 1 }, { num: 2 });
        });
        
        test('Postfix decrement number', () => {
            const reducer = redcr((state: NumberState) => state.num--);
            testReducer(reducer, { num: 2 }, { num: 1 });
        });
    });

    // These operators are syntactically valid unary operators, but using them as statements in their own
    // right is meaningless. These tests just make sure that redcr doesn't blow up when it encounters them.
    describe('Meaningless unary operator statements do nothing', () => {
        test('Exclamation mark', () => {
            const reducer = redcr((state: NumberState) => {
                !state.num;
            });
            testReducer(reducer, { num: 1 }, { num: 1 });
        });

        test('Tilde', () => {
            const reducer = redcr((state: NumberState) => {
                ~state.num;
            });
            testReducer(reducer, { num: 1 }, { num: 1 });
        });

        test('Plus', () => {
            const reducer = redcr((state: NumberState) => {
                +state.num;
            });
            testReducer(reducer, { num: 1 }, { num: 1 });
        });

        test('Minus', () => {
            const reducer = redcr((state: NumberState) => {
                -state.num;
            });
            testReducer(reducer, { num: 1 }, { num: 1 });
        });
    });

    // test('', () => {
    //     const reducer = redcr((state: NumberState) => {
    //         state.num++;
    //         state.num = (state.num + 2);
    //     });

    //     const oldState: NumberState = { num: 1 };
    //     const newState = reducer(oldState);
    
    //     expect(newState).toEqual({ num: 4 });
    //     expect(oldState).toEqual({ num: 1 });
    // });

    // test('Foo', () => {
    //     const reducer = redcr((state: NumberState) => {
    //         state.num++;
    //         state.num--;
    //     });

    //     const oldState: NumberState = { num: 1 };
    //     const newState = reducer(oldState);
    
    //     expect(newState).toEqual({ num: 1 });
    //     expect(oldState).toEqual({ num: 1 });
    // });

    // test('Foo', () => {
    //     const reducer = redcr((state: NumberState) => {
    //         state.num++;
    //         state.num++;
    //     });

    //     const oldState: NumberState = { num: 1 };
    //     const newState = reducer(oldState);
    
    //     expect(newState).toEqual({ num: 3 });
    //     expect(oldState).toEqual({ num: 1 });
    // });

    // test('Foo', () => {
    //     const reducer = redcr((state: NumberState) => {
    //         state.num += 2;
    //         state.num++;
    //     });

    //     const oldState: NumberState = { num: 1 };
    //     const newState = reducer(oldState);
    
    //     expect(newState).toEqual({ num: 4 });
    //     expect(oldState).toEqual({ num: 1 });
    // });

    // test('Foo', () => {
    //     const two = 2;
    //     const reducer = redcr((state: NumberState) => {
    //         state.num += two;
    //         state.num++;
    //     });

    //     const oldState: NumberState = { num: 1 };
    //     const newState = reducer(oldState);
    
    //     expect(newState).toEqual({ num: 4 });
    //     expect(oldState).toEqual({ num: 1 });
    // });
});

describe('Operator combining', () => {
    xtest('Increment three times', () => {
        const reducer = redcr((state: NumberState) => {
            state.num++;
            state.num++;
            state.num++;
        });
        testReducer(reducer, { num: 1 }, { num: 4 });
    });

    test('Increment then assign', () => {
        const reducer = redcr((state: NumberState) => {
            state.num++;
            state.num = 9;
        });
        testReducer(reducer, { num: 1 }, { num: 9 });
    });

    xtest('Increment then assign with self-reference', () => {
        const reducer = redcr((state: NumberState) => {
            state.num++;
            state.num = state.num + 1;
        });
        testReducer(reducer, { num: 1 }, { num: 3 });
    });

    test('Increment then accumulate', () => {
        const reducer = redcr((state: NumberState) => {
            state.num++;
            state.num += 2;
        });
        testReducer(reducer, { num: 1 }, { num: 4 });
    });

    xtest('Decrement three times', () => {
        const reducer = redcr((state: NumberState) => {
            state.num--;
            state.num--;
            state.num--;
        });
        testReducer(reducer, { num: 4 }, { num: 1 });
    });

    test('Accumulate then divide', () => {
        const reducer = redcr((state: NumberState) => {
            state.num += 5;
            state.num /= 2;
        });
        testReducer(reducer, { num: 1 }, { num: 3 });
    });

    test('Multiply then divide', () => {
        const reducer = redcr((state: NumberState) => {
            state.num *= 3;
            state.num /= 2;
        });
        testReducer(reducer, { num: 6 }, { num: 9 });
    });

    test('Multiply then assign', () => {
        const reducer = redcr((state: NumberState) => {
            state.num *= 3;
            state.num = 2;
        });
        testReducer(reducer, { num: 1 }, { num: 2 });
    });

    test('Multiply three times', () => {
        const reducer = redcr((state: NumberState) => {
            state.num *= 2;
            state.num *= 3;
            state.num *= 4;
        });
        testReducer(reducer, { num: 1 }, { num: 24 });
    });
});

describe('For-loops', () => {
    test('For-loop string concatenation', () => {
        const reducer = redcr((state: StringState) => {
            for (let i = 1; i <= 3; ++i) {
                state.str += i;
            }
        });
        testReducer(reducer, { str: '' }, { str: '123' });
    });
    
    test('Nested for-loop string concatenation', () => {
        const reducer = redcr((state: StringState) => {
            for (let i = 1; i <= 3; ++i) {
                for (let j = 1; j <= 3; ++j) {
                    state.str += (i + j);
                }
                state.str += ' ';
            }
        });
        testReducer(reducer, { str: '' }, { str: '234 345 456 ' });
    });
    
    test('For-of-loop string concatenation', () => {
        const reducer = redcr((state: StringState) => {
            for (const i of [1, 2, 3]) {
                state.str += i;
            }
        });
        testReducer(reducer, { str: '' }, { str: '123' });
    });
    
    test('For-in-loop string concatenation', () => {
        const reducer = redcr((state: StringState) => {
            const obj = {a: '1', b: '2', c: '3'};
            for (const i in obj) {
                state.str += i;
            }
        });
        testReducer(reducer, { str: '' }, { str: 'abc' });
    });
});

describe('Return statements', () => {
    test('Unnecessary return at end of block', () => {
        const reducer = redcr((state: StringState) => {
            state.str = 'new';
            return;
        });
        testReducer(reducer, { str: 'old' }, { str: 'new' });
    });
    
    test('Conditional return', () => {
        const val = 3;
        const reducer = redcr((state: StringState) => {
            if (val === 3) {
                state.str = '123';
                return state;
            }
            state.str = '456';
        });
        testReducer(reducer, { str: 'old' }, { str: '123' });
    });
    
    test('Dead statements after a return are ignored', () => {
        const reducer = redcr((state: StringState) => {
            return;
            state.str = 'new';
        });
        testReducer(reducer, { str: 'old' }, { str: 'old' });
    });
    
    test('Allow returning explicit state', () => {
        const val = 3;
        const reducer = redcr((state: StringState) => {
            if (val === 3) {
                return { str: '123' };
            }
            state.str = '456';
        });
        testReducer(reducer, { str: 'old' }, { str: '123' });
    });
});

describe('Assignment operators', () => {
    describe('Basic assignment', () => {
        test('Simple assignment', () => {
            const reducer = redcr((state: StringState) => {
                state.str = 'new';
            });
            testReducer(reducer, {str: 'old'}, {str: 'new'});
        });
        
        test('Non-null assert assignment', () => {
            const reducer = redcr((state: StringState) => {
                state!.str = 'new';
            });
            testReducer(reducer, {str: 'old'}, {str: 'new'});
        });
        
        test('Nested assignment', () => {
            const reducer = redcr((state: NestedObjectState) => {
                state.child.str = 'new';
            });
            testReducer(reducer, {child: {str: 'old' }}, {child: {str: 'new'}});
        });

        test('Assignment using local variable', () => {
            const reducer = redcr((state: OptionalStringState) => {
                let msg = 'local variable';
                state.str = msg;
            });
            testReducer(reducer, {}, {str: 'local variable'});
        });

        test('Bracket notation property access', () => {
            const reducer = redcr((state: StringState) => state['str'] = 'new');
            testReducer(reducer, {str: 'old'}, {str: 'new'});
        });
        
        test('Bracket notation property access in middle of chain', () => {
            const reducer = redcr((state: NestedObjectState) => state['child'].str = 'new');
            testReducer(reducer, {child: {str: 'old'}}, {child: {str: 'new'}});
        });
        
        test('Assign to arbitary ID of record', () => {
            interface State {
                record: Record<string, string>
            }
            // This looks very close to editing an array but it's not!
            const reducer = redcr((state: State) => state.record[1] = 'abc');
            testReducer(reducer, {record: {}}, {record: {'1': 'abc'}});
        });

        test('Use local variable in assignment', () => {
            const reducer = redcr((state: StringState) => {
                const tmp = 'new';
                state.str = tmp;
            });
            testReducer(reducer, { str: 'old' }, { str: 'new' });
        });
        
        test('Initially undefined local variable in assignment', () => {
            const reducer = redcr((state: StringState) => {
                let tmp;
                tmp = 'new';
                state.str = tmp;
            });
            testReducer(reducer, { str: 'old' }, { str: 'new' });
        });
        
        test('Reassign local variable in assignments', () => {
            const reducer = redcr((state: TwoNumberState) => {
                let tmp = 33;
                state.first = tmp;
                tmp = 44;
                state.second = tmp;
            });
            testReducer(reducer, { first: 88, second: 99 }, { first: 33, second: 44 });
        });
        
        test('Use free variable in assignment', () => {
            const someVar = 'new';
            const reducer = redcr((state: StringState) => state.str = someVar);
            testReducer(reducer, { str: 'old' }, { str: 'new' });
        });

        test('Assignment with self-reference', () => {
            const reducer = redcr((state: NumberState) => {
                // state.num++ would be less verbose but this should still work
                state.num = state.num + 1;
            });
            testReducer(reducer, { num: 1 }, { num: 2 });
        });
    });
    
    describe('Addition assignment', () => {
        test('Increment number', () => {
            const reducer = redcr((state: NumberState) => state.num += 2);
            testReducer(reducer, { num: 0 }, { num: 2 });
        });

        test('Increment number array element', () => {
            const reducer = redcr((state: NumberArrayState) => {
                state.arr[1] += 50;
            });
            testReducer(reducer, { arr: [1, 2, 3] }, { arr: [1, 52, 3] });
        });

        test('String concatenation', () => {
            const reducer = redcr((state: StringState) => {
                state.str += '222';
            });
            testReducer(reducer, { str: '111' }, { str: '111222' });
        });
        
        test('String concatenation on array element', () => {
            const reducer = redcr((state: StringArrayState) => {
                state.arr[1] += '222';
            });
            testReducer(reducer, { arr: ['a', 'b', 'c'] }, { arr: ['a', 'b222', 'c'] });
        });
    });

    test('Subtraction assignment', () => {
        const reducer = redcr((state: NumberState) => state.num -= 2);
        testReducer(reducer, { num: 2 }, { num: 0 });
    });
    
    test('Multiplication assignment', () => {
        const reducer = redcr((state: NumberState) => state.num *= 2);
        testReducer(reducer, { num: 2 }, { num: 4 });
    });
    
    test('Division assignment', () => {
        const reducer = redcr((state: NumberState) => state.num /= 2);
        testReducer(reducer, { num: 4 }, { num: 2 });
    });
    
    test('Remainder assignment', () => {
        const reducer = redcr((state: NumberState) => state.num %= 3);
        testReducer(reducer,  { num: 10 },  { num: 1 });
    });
    
    test('Exponentiation assignment', () => {
        const reducer = redcr((state: NumberState) => state.num **= 2);
        testReducer(reducer, { num: 10 }, { num: 100 });
    });
    
    describe('Bitshifts', () => {
        test('Left shift assignment', () => {
            const reducer = redcr((state: NumberState) => state.num <<= 2);
            testReducer(reducer, { num: 0b00100 }, { num: 0b10000 });
        });
    
        test('Right shift assignment', () => {
            const reducer = redcr((state: NumberState) => state.num >>= 2);
            testReducer(reducer, { num: 0b100 }, { num: 0b001 });
        });
        
        test('Unsigned right shift assignment', () => {
            const reducer = redcr((state: NumberState) => state.num >>>= 0);
            testReducer(reducer, { num: -1 }, { num: 0xFFFFFFFF });
        });
    })

    describe('Bitwise assignment', () => {
        test('Bitwise AND assignment', () => {
            const reducer = redcr((state: NumberState) => state.num &= 0b100);
            testReducer(reducer, { num: 0b101 }, { num: 0b100 });
        });
        
        test('Bitwise XOR assignment', () => {
            const reducer = redcr((state: NumberState) => state.num ^= 0b101);
            testReducer(reducer, { num: 0b100 }, { num: 0b001 });
        });
        
        test('Bitwise OR assignment', () => {
            const reducer = redcr((state: NumberState) => state.num |= 0b001);
            testReducer(reducer, { num: 0b100 }, { num: 0b101 });
        });
    })
    
    describe('Logical AND assignment', () => {
        test('LHS truthy', () => {
            const reducer = redcr((state: NumberState) => state.num &&= 3);
            testReducer(reducer, { num: 1 }, { num: 3 });
        });
    
        test('LHS falsy', () => {
            const reducer = redcr((state: NumberState) => state.num &&= 3);
            testReducer(reducer, { num: 0 }, { num: 0 });
        });
    });

    describe('Logical OR assignment', () => {
        test('LHS truthy', () => {
            const reducer = redcr((state: NumberState) => state.num ||= 3);
            testReducer(reducer, { num: 1 }, { num: 1 });
        });
    
        test('LHS falsy', () => {
            const reducer = redcr((state: NumberState) => state.num ||= 3);
            testReducer(reducer, { num: 0 }, { num: 3 });
        });
    });

    describe('Logical nullish assignment', () => {
        test('Existing value is null', () => {
            const reducer = redcr((state: NullableStringState) => state.str ??= 'new');
            testReducer(reducer, { str: null }, { str: 'new' });
        });

        test('Existing value is undefined', () => {
            const reducer = redcr((state: OptionalStringState) => state.str ??= 'new');
            testReducer(reducer, {}, { str: 'new' });
        });

        test('Existing value is not null or undefined', () => {
            const reducer = redcr((state: OptionalStringState) => state.str ??= 'new');
            testReducer(reducer, { str: 'old' }, { str: 'old' });
        });
    });
});
