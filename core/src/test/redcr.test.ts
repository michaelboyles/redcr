import { redcr } from "..";

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
    
        const oldState: StringState = {str: 'old'};
        const newState = reducer(oldState);
    
        expect(newState).toEqual({str: 'new'});
        expect(oldState).toEqual({str: 'old'});
    });

    test('Reducer is an anonymous function', () => {
        const reducer = redcr(function(state: OptionalStringState) {
            state.str = 'new';
        });
    
        const oldState: OptionalStringState = {};
        const newState = reducer(oldState);
    
        expect(newState).toEqual({str: 'new'});
        expect(oldState).toEqual({});
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
        
            const oldState: State = {arr: [0]};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({arr: [0, 1, 2, 3]});
            expect(oldState).toEqual({arr: [0]});
        });
        
        test('Array pop', () => {
            const reducer = redcr((state: NumberArrayState) => {
                state.arr.pop();
            });
        
            const oldState: NumberArrayState = {arr: [0, 1, 2]};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({arr: [0, 1]});
            expect(oldState).toEqual({arr: [0, 1, 2]});
        });
        
        test('Array pop as expression arrow function', () => {
            const reducer = redcr((state: NumberArrayState) => state.arr.pop());
        
            const oldState: NumberArrayState = {arr: [0, 1, 2]};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({arr: [0, 1]});
            expect(oldState).toEqual({arr: [0, 1, 2]});
        });
        
        test('Array shift', () => {
            const reducer = redcr((state: NumberArrayState) => {
                state.arr.shift();
            });
        
            const oldState: NumberArrayState = {arr: [0, 1, 2]};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({arr: [1, 2]});
            expect(oldState).toEqual({arr: [0, 1, 2]});
        });
        
        test('Array unshift', () => {
            const reducer = redcr((state: NumberArrayState) => {
                state.arr.unshift(0, 1);
            });
        
            const oldState: NumberArrayState = {arr: [2, 3]};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({arr: [0, 1, 2, 3]});
            expect(oldState).toEqual({arr: [2, 3]});
        });

        test('Array operation on array element', () => {
            interface State {
                arr: string[][];
            }

            const reducer = redcr((state: State) => {
                state.arr[1].push('d');
            });

            const oldState: State = {
                arr: [['a', 'b'], ['c']]
            };
            const newState = reducer(oldState);

            expect(newState).toEqual({arr: [['a', 'b'], ['c', 'd']]});
            expect(oldState).toEqual({arr: [['a', 'b'], ['c']]});
        });

        describe('Combinations', () => {
            test('Consecutive array pushes', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.push(2, 3);
                    state.arr.push(4);
                });
                const oldState: NumberArrayState = { arr: [1] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [1, 2, 3, 4] });
                expect(oldState).toEqual({ arr: [1] });
            });
            
            test('Consecutive array pops', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.pop();
                    state.arr.pop();
                });
                const oldState: NumberArrayState = { arr: [1, 2, 3] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [1] });
                expect(oldState).toEqual({ arr: [1, 2, 3] });
            });
            
            test('Consecutive array shifts', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.shift();
                    state.arr.shift();
                });
                const oldState: NumberArrayState = { arr: [1, 2, 3] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [3] });
                expect(oldState).toEqual({ arr: [1, 2, 3] });
            });
            
            test('Consecutive array unshifts', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.unshift(2, 3);
                    state.arr.unshift(1);
                });
                const oldState: NumberArrayState = { arr: [4] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [1, 2, 3, 4] });
                expect(oldState).toEqual({ arr: [4] });
            });
            
            test('Array unshift then array push', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.unshift(1);
                    state.arr.push(3);
                });
                const oldState: NumberArrayState = { arr: [2] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [1, 2, 3] });
                expect(oldState).toEqual({ arr: [2] });
            });
            
            test('Array shift then array pop', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.shift();
                    state.arr.pop();
                });
                const oldState: NumberArrayState = { arr: [1, 2, 3] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [2] });
                expect(oldState).toEqual({ arr: [1, 2, 3] });
            });
            
            test('Inverse operations result in no-op, appending to end', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.push(4);
                    state.arr.pop();
                });
                const oldState: NumberArrayState = { arr: [1, 2, 3] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [1, 2, 3] });
                expect(oldState).toEqual({ arr: [1, 2, 3] });
            });
            
            test('Inverse operations result in no-op, appending to start', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.unshift(1);
                    state.arr.shift();
                });
                const oldState: NumberArrayState = { arr: [2, 3, 4] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [2, 3, 4] });
                expect(oldState).toEqual({ arr: [2, 3, 4] });
            });
            
            test('Pushing multiple elements then popping partially undoes the push', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.push(4, 5);
                    state.arr.pop();
                });
                const oldState: NumberArrayState = { arr: [1, 2, 3] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [1, 2, 3, 4] });
                expect(oldState).toEqual({ arr: [1, 2, 3] });
            });
            
            test('Unshifting multiple elements then shifting partially undoes the unshift', () => {
                const reducer = redcr((state: NumberArrayState) => {
                    state.arr.unshift(1, 2, 3);
                    state.arr.shift();
                });
                const oldState: NumberArrayState = { arr: [4, 5] };
                const newState = reducer(oldState);
            
                expect(newState).toEqual({ arr: [2, 3, 4, 5] });
                expect(oldState).toEqual({ arr: [4, 5] });
            });
        });
    });

    describe('Access by index', () => {
        test('Assign to arbitary array index', () => {
            const reducer = redcr((state: NumberArrayState) => state.arr[1] = 999);
        
            const oldState: NumberArrayState = {arr: [0, 1, 2]};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({arr: [0, 999, 2]});
            expect(oldState).toEqual({arr: [0, 1, 2]});
        });
        
        test('Assign to multiple array indices', () => {
            const reducer = redcr((state: NumberArrayState) => {
                state.arr[1] = 888;
                state.arr[6] = 999;
            });
        
            const oldState: NumberArrayState = {arr: [0, 1, 2]};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({arr: [0, 888, 2, , , , 999]});
            expect(oldState).toEqual({arr: [0, 1, 2]});
        });        
    });
});

describe('Delete operator', () => {
    test('Delete field', () => {
        const reducer = redcr((state: OptionalStringState) => delete state.str);
    
        const oldState: OptionalStringState = {str: 'old'};
        const newState = reducer(oldState);
    
        expect(newState).toEqual({});
        expect(oldState).toEqual({str: 'old'});
    });
    
    test('Dynamic field delete', () => {
        const reducer = redcr((state: OptionalStringState) => delete state['str']);
    
        const oldState: OptionalStringState = {str: 'old'};
        const newState = reducer(oldState);
    
        expect(newState).toEqual({});
        expect(oldState).toEqual({str: 'old'});
    });
    
    test('Delete two properties of object', () => {
        const reducer = redcr((state: TwoOptionalNumberState) => {
            delete state.first;
            delete state.second;
        });
        const oldState: TwoOptionalNumberState = { first: 1, second: 2 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({});
        expect(oldState).toEqual({ first: 1, second: 2 });
    });
    
    test('Delete two properties of object dynamically', () => {
        const reducer = redcr((state: TwoOptionalNumberState) => {
            delete state['first'];
            delete state['second'];
        });
        const oldState: TwoOptionalNumberState = { first: 1, second: 2 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({});
        expect(oldState).toEqual({ first: 1, second: 2 });
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
        
            const oldState: OptionalStringState = {};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({str: 'condition was false'});
            expect(oldState).toEqual({});
        });
        
        test('Assignment inside and outside of if', () => {
            const condition = true;
        
            const reducer = redcr((state: TwoNumberState) => {
                state.first = 333;
                if (condition) {
                    state.second = 444;
                }
            });
        
            const oldState: TwoNumberState = {first: 111, second: 222};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({first: 333, second: 444});
            expect(oldState).toEqual({first: 111, second: 222});
        });

        test('Local variable used in condition', () => {
            const reducer = redcr((state: StringState) => {
                const condition = true;
                if (condition) {
                    state.str = 'new';
                }
            });
            const oldState: StringState = { str: 'old' };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'new' });
            expect(oldState).toEqual({ str: 'old' });
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
            const oldState: StringState = { str: 'old' };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'one' });
            expect(oldState).toEqual({ str: 'old' });
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
            const oldState: StringState = { str: 'old' };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'one or two' });
            expect(oldState).toEqual({ str: 'old' });
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
            const oldState: StringState = { str: 'old' };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'not one' });
            expect(oldState).toEqual({ str: 'old' });
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
            const oldState: StringState = { str: '' };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'aaabbb' });
            expect(oldState).toEqual({ str: '' });
        });
    });
});

describe('Destructuring', () => {
    test('Destructured assignment', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const { child } = state;
            child.str = 'new';
        });
    
        const oldState: NestedObjectState = { child: { str: 'old' } };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ child: { str: 'new' } });
        expect(oldState).toEqual({ child: { str: 'old' } });
    });
    
    test('Destructured assignment with different identifier', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const { child: foo } = state;
            foo.str = 'new';
        });
    
        const oldState: NestedObjectState = { child: { str: 'old' } };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ child: { str: 'new' } });
        expect(oldState).toEqual({ child: { str: 'old' } });
    });
    
    test('Two levels of destructuring with assignment', () => {
        const reducer = redcr((state: DoubleNestedObjectState) => {
            const { one: { two } } = state;
            two.str = 'new';
        });
    
        const oldState: DoubleNestedObjectState = { one: { two: { str: 'old' } } };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ one: { two: { str: 'new' } } });
        expect(oldState).toEqual({ one: { two: { str: 'old' } } });
    });
    
    test('Two levels of destructuring with assignment and alternate identifier', () => {
        const reducer = redcr((state: DoubleNestedObjectState) => {
            const { one: { two: foo } } = state;
            foo.str = 'new';
        });
    
        const oldState: DoubleNestedObjectState = { one: { two: { str: 'old' } } };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ one: { two: { str: 'new' } } });
        expect(oldState).toEqual({ one: { two: { str: 'old' } } });
    });
    
    test('Destructured assignment with string literal', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const { 'child': foo } = state;
            foo.str = 'new';
        });
    
        const oldState: NestedObjectState = { child: { str: 'old' } };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ child: { str: 'new' } });
        expect(oldState).toEqual({ child: { str: 'old' } });
    });
    
    test('Destructured assignment with number literal', () => {
        interface State {
            123: { str: string }
        }
    
        const reducer = redcr((state: State) => {
            const { 123: foo } = state;
            foo.str = 'new';
        });
    
        const oldState: State = { 123: { str: 'old' } };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ 123: { str: 'new' } });
        expect(oldState).toEqual({ 123: { str: 'old' } });
    });
    
    test('Destructured assignment with computed property', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const { ['child']: foo } = state;
            foo.str = 'new';
        });
    
        const oldState: NestedObjectState = { child: { str: 'old' } };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ child: { str: 'new' } });
        expect(oldState).toEqual({ child: { str: 'old' } });
    });
    
    test('Destructured assignment with computed property referencing variable', () => {
        const reducer = redcr((state: NestedObjectState) => {
            const field = 'child';
            const { [field]: foo } = state;
            foo.str = 'new';
        });
    
        const oldState: NestedObjectState = { child: { str: 'old' } };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ child: { str: 'new' } });
        expect(oldState).toEqual({ child: { str: 'old' } });
    });
});

describe('Unary operators', () => {
    describe('Prefix', () => {
        test('Prefix increment number as expression arrow function', () => {
            const reducer = redcr((state: NumberState) => ++state.num);
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 2 });
            expect(oldState).toEqual({ num: 1 });
        });
        
        test('Prefix increment number as block arrow function', () => {
            const reducer = redcr((state: NumberState) => {
                ++state.num
            });
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 2 });
            expect(oldState).toEqual({ num: 1 });
        });
        
        test('Prefix decrement number', () => {
            const reducer = redcr((state: NumberState) => --state.num);
            const oldState: NumberState = { num: 2 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 1 });
            expect(oldState).toEqual({ num: 2 });
        });
    });

    describe('Postfix', () => {
        test('Postfix increment number', () => {
            const reducer = redcr((state: NumberState) => state.num++);
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 2 });
            expect(oldState).toEqual({ num: 1 });
        });
        
        test('Postfix decrement number', () => {
            const reducer = redcr((state: NumberState) => state.num--);
            const oldState: NumberState = { num: 2 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 1 });
            expect(oldState).toEqual({ num: 2 });
        });
    });

    // These operators are syntactically valid unary operators, but using them as statements in their own
    // right is meaningless. These tests just make sure that redcr doesn't blow up when it encounters them.
    describe('Meaningless unary operator statements do nothing', () => {
        test('Exclamation mark', () => {
            const reducer = redcr((state: NumberState) => {
                !state.num;
            });
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 1 });
            expect(oldState).toEqual({ num: 1 });
        });

        test('Tilde', () => {
            const reducer = redcr((state: NumberState) => {
                ~state.num;
            });
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 1 });
            expect(oldState).toEqual({ num: 1 });
        });

        test('Plus', () => {
            const reducer = redcr((state: NumberState) => {
                +state.num;
            });
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 1 });
            expect(oldState).toEqual({ num: 1 });
        });

        test('Minus', () => {
            const reducer = redcr((state: NumberState) => {
                -state.num;
            });
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 1 });
            expect(oldState).toEqual({ num: 1 });
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

        const oldState: NumberState = { num: 1 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 4 });
        expect(oldState).toEqual({ num: 1 });
    });

    test('Increment then assign', () => {
        const reducer = redcr((state: NumberState) => {
            state.num++;
            state.num = 9;
        });

        const oldState: NumberState = { num: 1 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 9 });
        expect(oldState).toEqual({ num: 1 });
    });

    xtest('Increment then assign with self-reference', () => {
        const reducer = redcr((state: NumberState) => {
            state.num++;
            state.num = state.num + 1;
        });

        const oldState: NumberState = { num: 1 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 3 });
        expect(oldState).toEqual({ num: 1 });
    });

    test('Increment then accumulate', () => {
        const reducer = redcr((state: NumberState) => {
            state.num++;
            state.num += 2;
        });

        const oldState: NumberState = { num: 1 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 4 });
        expect(oldState).toEqual({ num: 1 });
    });

    xtest('Decrement three times', () => {
        const reducer = redcr((state: NumberState) => {
            state.num--;
            state.num--;
            state.num--;
        });

        const oldState: NumberState = { num: 4 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 4 });
        expect(oldState).toEqual({ num: 1 });
    });

    test('Accumulate then divide', () => {
        const reducer = redcr((state: NumberState) => {
            state.num += 5;
            state.num /= 2;
        });

        const oldState: NumberState = { num: 1 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 3 });
        expect(oldState).toEqual({ num: 1 });
    });

    test('Multiply then divide', () => {
        const reducer = redcr((state: NumberState) => {
            state.num *= 3;
            state.num /= 2;
        });

        const oldState: NumberState = { num: 6 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 9 });
        expect(oldState).toEqual({ num: 6 });
    });

    test('Multiply then assign', () => {
        const reducer = redcr((state: NumberState) => {
            state.num *= 3;
            state.num = 2;
        });

        const oldState: NumberState = { num: 1 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 2 });
        expect(oldState).toEqual({ num: 1 });
    });

    test('Multiply three times', () => {
        const reducer = redcr((state: NumberState) => {
            state.num *= 2;
            state.num *= 3;
            state.num *= 4;
        });

        const oldState: NumberState = { num: 1 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 24 });
        expect(oldState).toEqual({ num: 1 });
    });
});

describe('For-loops', () => {
    test('For-loop string concatenation', () => {
        const reducer = redcr((state: StringState) => {
            for (let i = 1; i <= 3; ++i) {
                state.str += i;
            }
        });
        const oldState: StringState = { str: '' };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ str: '123' });
        expect(oldState).toEqual({ str: '' });
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
        const oldState: StringState = { str: '' };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ str: '234 345 456 ' });
        expect(oldState).toEqual({ str: '' });
    });
    
    test('For-of-loop string concatenation', () => {
        const reducer = redcr((state: StringState) => {
            for (const i of [1, 2, 3]) {
                state.str += i;
            }
        });
        const oldState: StringState = { str: '' };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ str: '123' });
        expect(oldState).toEqual({ str: '' });
    });
    
    test('For-in-loop string concatenation', () => {
        const reducer = redcr((state: StringState) => {
            const obj = {a: '1', b: '2', c: '3'};
            for (const i in obj) {
                state.str += i;
            }
        });
        const oldState: StringState = { str: '' };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ str: 'abc' });
        expect(oldState).toEqual({ str: '' });
    });
});

describe('Return statements', () => {
    test('Unnecessary return at end of block', () => {
        const reducer = redcr((state: StringState) => {
            state.str = 'new';
            return;
        });
        const oldState: StringState = { str: 'old' };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ str: 'new' });
        expect(oldState).toEqual({ str: 'old' });
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
        const oldState: StringState = { str: 'old' };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ str: '123' });
        expect(oldState).toEqual({ str: 'old' });
    });
    
    test('Dead statements after a return are ignored', () => {
        const reducer = redcr((state: StringState) => {
            return;
            state.str = 'new';
        });
        const oldState: StringState = { str: 'old' };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ str: 'old' });
        expect(oldState).toEqual({ str: 'old' });
    });
    
    test('Allow returning explicit state', () => {
        const val = 3;
        const reducer = redcr((state: StringState) => {
            if (val === 3) {
                return { str: '123' };
            }
            state.str = '456';
        });
        const oldState: StringState = { str: 'old' };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ str: '123' });
        expect(oldState).toEqual({ str: 'old' });
    });
});

describe('Assignment operators', () => {
    describe('Basic assignment', () => {
        test('Simple assignment', () => {
            const reducer = redcr((state: StringState) => {
                state.str = 'new';
            });
        
            const oldState: StringState = {str: 'old'};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({str: 'new'});
            expect(oldState).toEqual({str: 'old'});
        });
        
        test('Non-null assert assignment', () => {
            const reducer = redcr((state: StringState) => {
                state!.str = 'new';
            });
        
            const oldState: StringState = {str: 'old'};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({str: 'new'});
            expect(oldState).toEqual({str: 'old'});
        });
        
        test('Nested assignment', () => {
            const reducer = redcr((state: NestedObjectState) => {
                state.child.str = 'new';
            });
        
            const oldState: NestedObjectState = {child: {str: 'old' }};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({child: {str: 'new'}});
            expect(oldState).toEqual({child: {str: 'old'}});
        });

        test('Assignment using local variable', () => {
            const reducer = redcr((state: OptionalStringState) => {
                let msg = 'local variable';
                state.str = msg;
            });
        
            const oldState: OptionalStringState = {};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({str: 'local variable'});
            expect(oldState).toEqual({});
        });

        test('Bracket notation property access', () => {
            const reducer = redcr((state: StringState) => state['str'] = 'new');
        
            const oldState: StringState = {str: 'old'};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({str: 'new'});
            expect(oldState).toEqual({str: 'old'});
        });
        
        test('Bracket notation property access in middle of chain', () => {
            const reducer = redcr((state: NestedObjectState) => state['child'].str = 'new');
        
            const oldState: NestedObjectState = {child: {str: 'old'}};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({child: {str: 'new'}});
            expect(oldState).toEqual({child: {str: 'old'}});
        });
        
        test('Assign to arbitary ID of record', () => {
            interface State {
                record: Record<string, string>
            }
            // This looks very close to editing an array but it's not!
            const reducer = redcr((state: State) => state.record[1] = 'abc');
        
            const oldState: State = {record: {}};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({record: {'1': 'abc'}});
            expect(oldState).toEqual({record: {}});
        });

        test('Use local variable in assignment', () => {
            const reducer = redcr((state: StringState) => {
                const tmp = 'new';
                state.str = tmp;
            });
        
            const oldState: StringState = {
                str: 'old'
            };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'new' });
            expect(oldState).toEqual({ str: 'old' });
        });
        
        test('Initially undefined local variable in assignment', () => {
            const reducer = redcr((state: StringState) => {
                let tmp;
                tmp = 'new';
                state.str = tmp;
            });
        
            const oldState: StringState = { str: 'old' };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'new' });
            expect(oldState).toEqual({ str: 'old' });
        });
        
        test('Reassign local variable in assignments', () => {
            const reducer = redcr((state: TwoNumberState) => {
                let tmp = 33;
                state.first = tmp;
                tmp = 44;
                state.second = tmp;
            });
        
            const oldState: TwoNumberState = {
                first: 88, second: 99
            };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ first: 33, second: 44 });
            expect(oldState).toEqual({ first: 88, second: 99 });
        });
        
        test('Use free variable in assignment', () => {
            const someVar = 'new';
            const reducer = redcr((state: StringState) => state.str = someVar);
        
            const oldState: StringState = { str: 'old' };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'new' });
            expect(oldState).toEqual({ str: 'old' });
        });

        test('Assignment with self-reference', () => {
            const reducer = redcr((state: NumberState) => {
                // state.num++ would be less verbose but this should still work
                state.num = state.num + 1;
            });
    
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 2 });
            expect(oldState).toEqual({ num: 1 });
        });
    });
    
    describe('Addition assignment', () => {
        test('Increment number', () => {
            const reducer = redcr((state: NumberState) => state.num += 2);
            const oldState: NumberState = { num: 0 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 2 });
            expect(oldState).toEqual({ num: 0 });
        });

        test('Increment number array element', () => {
            const reducer = redcr((state: NumberArrayState) => {
                state.arr[1] += 50;
            });
        
            const oldState: NumberArrayState = {
                arr: [1, 2, 3]
            };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({arr: [1, 52, 3]});
            expect(oldState).toEqual({arr: [1, 2, 3]});
        });

        test('String concatenation', () => {
            const reducer = redcr((state: StringState) => {
                state.str += '222';
            });
        
            const oldState: StringState = {
                str: '111'
            };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({str: '111222'});
            expect(oldState).toEqual({str: '111'});
        });
        
        test('String concatenation on array element', () => {
            const reducer = redcr((state: StringArrayState) => {
                state.arr[1] += '222';
            });
        
            const oldState: StringArrayState = {
                arr: ['a', 'b', 'c']
            };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({arr: ['a', 'b222', 'c']});
            expect(oldState).toEqual({arr: ['a', 'b', 'c']});
        });
    });

    test('Subtraction assignment', () => {
        const reducer = redcr((state: NumberState) => state.num -= 2);
        const oldState: NumberState = { num: 2 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 0 });
        expect(oldState).toEqual({ num: 2 });
    });
    
    test('Multiplication assignment', () => {
        const reducer = redcr((state: NumberState) => state.num *= 2);
        const oldState: NumberState = { num: 2 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 4 });
        expect(oldState).toEqual({ num: 2 });
    });
    
    test('Division assignment', () => {
        const reducer = redcr((state: NumberState) => state.num /= 2);
        const oldState: NumberState = { num: 4 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 2 });
        expect(oldState).toEqual({ num: 4 });
    });
    
    test('Remainder assignment', () => {
        const reducer = redcr((state: NumberState) => state.num %= 3);
        const oldState: NumberState = { num: 10 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 1 });
        expect(oldState).toEqual({ num: 10 });
    });
    
    test('Exponentiation assignment', () => {
        const reducer = redcr((state: NumberState) => state.num **= 2);
        const oldState: NumberState = { num: 10 };
        const newState = reducer(oldState);
    
        expect(newState).toEqual({ num: 100 });
        expect(oldState).toEqual({ num: 10 });
    });
    
    describe('Bitshifts', () => {
        test('Left shift assignment', () => {
            const reducer = redcr((state: NumberState) => state.num <<= 2);
            const oldState: NumberState = { num: 0b00100 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 0b10000 });
            expect(oldState).toEqual({ num: 0b00100 });
        });
    
        test('Right shift assignment', () => {
            const reducer = redcr((state: NumberState) => state.num >>= 2);
            const oldState: NumberState = { num: 0b100 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 0b001 });
            expect(oldState).toEqual({ num: 0b100 });
        });
        
        test('Unsigned right shift assignment', () => {
            const reducer = redcr((state: NumberState) => state.num >>>= 0);
            const oldState: NumberState = { num: -1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 0xFFFFFFFF });
            expect(oldState).toEqual({ num: -1 });
        });
    })

    describe('Bitwise assignment', () => {
        test('Bitwise AND assignment', () => {
            const reducer = redcr((state: NumberState) => state.num &= 0b100);
            const oldState: NumberState = { num: 0b101 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 0b100 });
            expect(oldState).toEqual({ num: 0b101 });
        });
        
        test('Bitwise XOR assignment', () => {
            const reducer = redcr((state: NumberState) => state.num ^= 0b101);
            const oldState: NumberState = { num: 0b100 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 0b001 });
            expect(oldState).toEqual({ num: 0b100 });
        });
        
        test('Bitwise OR assignment', () => {
            const reducer = redcr((state: NumberState) => state.num |= 0b001);
            const oldState: NumberState = { num: 0b100 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 0b101 });
            expect(oldState).toEqual({ num: 0b100 });
        });
    })
    
    describe('Logical AND assignment', () => {
        test('LHS truthy', () => {
            const reducer = redcr((state: NumberState) => state.num &&= 3);
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 3 });
            expect(oldState).toEqual({ num: 1 });
        });
    
        test('LHS falsy', () => {
            const reducer = redcr((state: NumberState) => state.num &&= 3);
            const oldState: NumberState = { num: 0 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 0 });
            expect(oldState).toEqual({ num: 0 });
        });
    });

    describe('Logical OR assignment', () => {
        test('LHS truthy', () => {
            const reducer = redcr((state: NumberState) => state.num ||= 3);
            const oldState: NumberState = { num: 1 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 1 });
            expect(oldState).toEqual({ num: 1 });
        });
    
        test('LHS falsy', () => {
            const reducer = redcr((state: NumberState) => state.num ||= 3);
            const oldState: NumberState = { num: 0 };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ num: 3 });
            expect(oldState).toEqual({ num: 0 });
        });
    });

    describe('Logical nullish assignment', () => {
        test('Existing value is null', () => {
            const reducer = redcr((state: NullableStringState) => state.str ??= 'new');
            const oldState: NullableStringState = { str: null };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'new' });
            expect(oldState).toEqual({ str: null });
        });

        test('Existing value is undefined', () => {
            const reducer = redcr((state: OptionalStringState) => state.str ??= 'new');
            const oldState: OptionalStringState = {};
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'new' });
            expect(oldState).toEqual({});
        });

        test('Existing value is not null or undefined', () => {
            const reducer = redcr((state: OptionalStringState) => state.str ??= 'new');
            const oldState: OptionalStringState = { str: 'old' };
            const newState = reducer(oldState);
        
            expect(newState).toEqual({ str: 'old' });
            expect(oldState).toEqual({ str: 'old' });
        });
    });
});
