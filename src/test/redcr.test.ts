import { redcr } from "../redcr";

test('Simple assignment', () => {
    interface State {
        str: string;
    }
    const reducer = redcr((state: State) => {
        state.str = 'new';
    });

    const oldState: State = {str: 'old'};
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
