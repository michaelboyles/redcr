import { Parent } from './misc';
import { redcr } from './redcr';

export const myReducer = redcr((parent: Parent): Parent => {
    parent.str = 'abc';
    parent.str2 = 'def';
    parent.child!.str = 'ghi';
    parent.nums.push(3, 4, 5);

    return parent;
})
