import { Parent } from './misc';

const myReducer = (parent: Parent): Parent => {
    parent.str = 'abc';
    parent.str2 = 'def';

    return parent;
}
