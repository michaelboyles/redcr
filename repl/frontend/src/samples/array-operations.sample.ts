import { redcr } from 'redcr';

interface State {
    array1: number[];
    array2: number[];
    array3: number[];
    array4: number[];
}

const reducer = redcr((state: State) => {
    state.array1.pop();
    state.array2.push(123, 456);
    state.array3.shift();
    state.array4.unshift(789);
});
