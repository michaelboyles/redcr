import { redcr } from 'redcr';

interface State {
    foo: {
        bar: {
            baz: string;
        }
        array: number[];
    }
}

const reducer = redcr((state: State) => {
    const { foo: { bar: myBar, array } } = state;
    myBar.baz = 'abc';
    array.push(123);
});
