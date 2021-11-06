import { redcr } from 'redcr';

interface State {
    first: number;
    second: number;
}

const reducer = redcr((state: State) => {
    state.first++;
    --state.second;
});
