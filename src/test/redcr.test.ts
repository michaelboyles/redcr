import { redcr } from "..";

interface StringState {
    str: string;
};
type OptionalStringState = Partial<StringState>;

test('Simple assignment', () => {
    const reducer = redcr((state: StringState) => {
        state.str = 'new';
    });

    const oldState: StringState = {str: 'old'};
    const newState = reducer(oldState);

    expect(newState).toEqual({str: 'new'});
    expect(oldState).toEqual({str: 'old'});
});

test('Nested assignment', () => {
    interface State {
        child: {
            str: string;   
        }
    }
    const reducer = redcr((state: State) => {
        state.child.str = 'new';
    });

    const oldState: State = {child: {str: 'old' }};
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
    interface State {
        arr: number[]
    }
    const reducer = redcr((state: State) => {
        state.arr.pop();
    });

    const oldState: State = {arr: [0, 1, 2]};
    const newState = reducer(oldState);

    expect(newState).toEqual({arr: [0, 1]});
    expect(oldState).toEqual({arr: [0, 1, 2]});
});

test('Array shift', () => {
    interface State {
        arr: number[]
    }
    const reducer = redcr((state: State) => {
        state.arr.shift();
    });

    const oldState: State = {arr: [0, 1, 2]};
    const newState = reducer(oldState);

    expect(newState).toEqual({arr: [1, 2]});
    expect(oldState).toEqual({arr: [0, 1, 2]});
});

test('Array unshift', () => {
    interface State {
        arr: number[]
    }
    const reducer = redcr((state: State) => {
        state.arr.unshift(0, 1);
    });

    const oldState: State = {arr: [2, 3]};
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
    interface State {
        child: {
            str: string;
        }
    }
    const reducer = redcr((state: State) => state['child'].str = 'new');

    const oldState: State = {child: {str: 'old'}};
    const newState = reducer(oldState);

    expect(newState).toEqual({child: {str: 'new'}});
    expect(oldState).toEqual({child: {str: 'old'}});
});

test('Assign to arbitary array index', () => {
    interface State {
        arr: number[];
    }
    const reducer = redcr((state: State) => state.arr[1] = 999);

    const oldState: State = {arr: [0, 1, 2]};
    const newState = reducer(oldState);

    expect(newState).toEqual({arr: [0, 999, 2]});
    expect(oldState).toEqual({arr: [0, 1, 2]});
});

test('Assign to multiple array indices', () => {
    interface State {
        arr: number[];
    }
    const reducer = redcr((state: State) => {
        state.arr[1] = 888;
        state.arr[6] = 999;
    });

    const oldState: State = {arr: [0, 1, 2]};
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

test('Conditional assignment', () => {
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

// test('Assignment using local variable', () => {
//     const reducer = redcr((state: OptionalStringState) => {
//         let msg = 'local variable';
//         state.str = msg;
//     });

//     const oldState: OptionalStringState = {};
//     const newState = reducer(oldState);

//     expect(newState).toEqual({str: 'local variable'});
//     expect(oldState).toEqual({});
// });
