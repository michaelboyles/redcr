[![Build status](https://img.shields.io/github/workflow/status/michaelboyles/redcr/Build%20with%20npm)](https://github.com/michaelboyles/redcr/actions)
[![NPM release](https://img.shields.io/npm/v/redcr)](https://www.npmjs.com/package/redcr)
[![License](https://img.shields.io/github/license/michaelboyles/redcr)](https://github.com/michaelboyles/redcr/blob/develop/LICENSE)

Redcr (pronounced *redka* [like the British town](https://en.wikipedia.org/wiki/Redcar)) is an experimental
alternative to [Immer](https://github.com/immerjs/immer).

<p align="center">👉 &nbsp;<a href="https://michaelboyles.github.io/redcr/">Try the online REPL<a> 👈</p>

Redux reducers require you to update your state in an immutable way, by creating a copy of the previous state with any changes applied.
In mordern JavaScript, this can involve a tonne of spread operators. It's difficult to read and write a reducer in this way.
    
Immer takes a runtime approach to solving this problem which has a performance impact 
[approximately 2-6 times worse](https://immerjs.github.io/immer/performance) than a handwritten reducer, and involves shipping an additional
dependency to clients.

Redcr works at compile-time by automatically converting any reducer wrapped in `redcr(...)` to use immutable operations instead of mutable
ones. Redcr has no impact on runtime bundle size, and theoretically has comparable performance to a handwritten reducer.

For example, this reducer 

```typescript
import { redcr } from 'redcr';

const myReducer = redcr((state: State) => {
    state.child.str = 'new';
    state.array.push(1);
    state.anotherArray.pop();
});
```

will be automatically converted to something like this (the exact output depends on what ES version you're targeting) when the code is
compiled to JavaScript:

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

## 💿 Install

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

## 📙 Supported operations

| Type                  | Example                              |
|-----------------------|--------------------------------------|
| Assignment            | `foo.bar = 123`                      |
| Bracket syntax        | `foo['bar'] = 123`                   |
| String concatenation  | `foo.bar += 'hello'`                 |
| Delete operator       | `delete foo.bar`                     |
| Array access by index | `foo.arr[0] = 123`                   |
| Array.push            | `foo.arr.push(123)`                  |
| Array.pop             | `foo.arr.pop()`                      |
| Array.shift           | `foo.arr.shift()`                    |
| Array.unshift         | `foo.arr.unshift(123)`               |
| Conditional mutation  | ``` if (condition) foo.bar = 123 ``` |
| Local variables       | ``` let tmp = 3; foo.bar = tmp; ```  |
| Increment/decrement   | ``` foo.num++; foo.bar--; ```        |

See [proposed features](https://github.com/michaelboyles/redcr/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
    
 ## 📝 Contributing 

Contributions are welcome. Bug reports and use-cases are just as valuable as PRs. All code changes must be accompanied by tests.
