import { redcr } from 'redcr';

interface State {
    str: string;
}

const reducer = redcr((state: State) => {
    state.str += 'abc';
});
