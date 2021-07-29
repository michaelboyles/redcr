Redcr (pronounced *redka* [like the British town](https://en.wikipedia.org/wiki/Redcar)) is an experimental
alternative to [Immer](https://github.com/immerjs/immer).

Immer works by create a "draft copy" of the state you wish to change and mututating the draft copy. This has a performance impact
[approximately 2-6 times worse](https://immerjs.github.io/immer/performance) than a handwritten reducer. Handwritten reducers
are unwieldy, that's why Immer exists in the first place.

Redcr works by taking a known set of mutations and automatically converting them to immutable operations using
TypeScript compiler transforms. You can write the following reducer using normal, mutable operations:

```typescript
const reducer = redcr((state: State) => {
    state.child.str = 'new';
    state.array.push(1);
    state.anotherArray.pop();
});
```

These mutable operations will be automatically replaced with their immutable counterparts when the code is compiled to JavaScript:

```typescript
const myReducer = (state) => {
    return {
        ...state,
        child: {
            ...parent.child,
            str: 'new'
        },
        array: [...state.array, 1]
        annotherArray: state.anotherArray.slice(0, state.anotherArray.length - 1)
    };
};
```

Browser support for the spread operator is not required, since TypeScript can replace it with a polyfill. 

## Currently supported operations:

 - Property assignment e.g. `state.foo.bar = 123;`
 - These array operations
    - push e.g. `state.arr.push(1, 2, 3);`
    - pop e.g. `state.arr.pop();`
    - shift e.g. `state.arr.shift();`
    - unshift e.g. `state.arr.unshift(1, 2);`
