import { redcr } from 'redcr';

interface State {
    str: string;
}

interface Action {
    num: number;
}

const reducer = redcr((state: State, action: Action) => {
    if (action.num < 10) {
        state.str = 'foo';
    }
    else {
        state.str = 'bar';
    }
});
