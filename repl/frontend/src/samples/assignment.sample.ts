import { redcr } from 'redcr';

interface StringState {
    str: string;
}

const reducer = redcr((state: StringState) => {
    state.str = 'foo';
});
