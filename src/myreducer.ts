import { Parent } from './misc';

export const myReducer = (parent: Parent): Parent => {
    parent.str = 'abc';
    parent.str2 = 'def';
    parent.child!.str = 'ghi';
    parent.nums.push(3, 4, 5);

    return parent;
}
