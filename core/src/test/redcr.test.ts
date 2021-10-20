import { redcr } from "..";

interface StringState {
    str: string
}
type OptionalStringState = Partial<StringState>;

interface TwoNumberState {
    first: number,
    second: number
}
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

test('Arrow function with expression body', () => {
    const reducer = redcr((state: StringState) => state.str = 'new');

    const oldState: StringState = {str: 'old'};
    const newState = reducer(oldState);

    expect(newState).toEqual({str: 'new'});
    expect(oldState).toEqual({str: 'old'});
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


test('Reducer is an anonymous function', () => {
    const reducer = redcr(function(state: OptionalStringState) {
        state.str = 'new';
    });

    const oldState: OptionalStringState = {};
    const newState = reducer(oldState);

    expect(newState).toEqual({str: 'new'});
    expect(oldState).toEqual({});
});

test('String concatenation operator +=', () => {
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
