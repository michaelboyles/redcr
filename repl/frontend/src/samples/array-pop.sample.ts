import { redcr } from 'redcr';

interface ArrayState {
    array: number[];
}

const reducer = redcr((state: ArrayState) => {
    state.array.pop();
});
