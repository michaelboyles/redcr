import { Parent } from './misc';
import { redcr } from '../../redcr';

const myReducer = redcr((parent: Parent): Parent => {
    parent.str = 'abc';
    parent.str2 = 'def';
    parent.child!.str = 'ghi';
    parent.nums.push(3, 4, 5);

    return parent;
})

console.log(
    'Result of reducer',
    myReducer({
        str: '123',
        str2: '456',
        nums: [0, 1, 2],
        child: {
            str: '789'
        }
    })
);
