import { Parent } from './misc';

export const myReducer = (parent: Parent): Parent => {
    parent.str = 'abc';
    parent.str2 = 'def';
    parent.child.str = 'ghi';

    return parent;
}
