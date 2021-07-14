import { myReducer } from './myreducer';

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
