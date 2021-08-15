[![Build status](https://img.shields.io/github/workflow/status/michaelboyles/redcr/Build%20with%20npm)](https://github.com/michaelboyles/redcr/actions)
[![NPM release](https://img.shields.io/npm/v/redcr)](https://www.npmjs.com/package/redcr)
[![License](https://img.shields.io/github/license/michaelboyles/redcr)](https://github.com/michaelboyles/redcr/blob/develop/LICENSE)

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

## Install

**Redcr** works by using TypeScript compiler transforms. Even though this is a [native TypeScript feature](https://github.com/microsoft/TypeScript-wiki/blob/master/Using-the-Compiler-API.md), it's not yet exposed publically. You need
[**ttypescript**](https://github.com/cevek/ttypescript) which is a smaller wrapper around TypeScript which exposes that feature.

```
npm install --save-dev redcr ttypescript
```

Follow [**ttypescript**'s setup](https://github.com/cevek/ttypescript#how-to-use) for the specific tools you're using. There is
different configuration for Webpack, Rollup, Jest, etc but mostly they're just 1 or 2 lines of configuration to re-point the compiler.

Then in your `tsconfig.json` add the transformation:

```json
{
    "compilerOptions": {
        "plugins": [
            { "transform": "redcr/transform" },
        ]
    }
}
```

## Currently supported operations

 - Assignment
    - Simple property e.g. `state.foo.bar = 123;`
    - Bracket syntax e.g. `state['foo'].bar = 123;`
    - Array index e.g. `state.arr[3] = 123;`
 - These array operations
    - push e.g. `state.arr.push(1, 2, 3);`
    - pop e.g. `state.arr.pop();`
    - shift e.g. `state.arr.shift();`
    - unshift e.g. `state.arr.unshift(1, 2);`
