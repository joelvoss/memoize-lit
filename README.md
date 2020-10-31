# memoize-lit

A memoization library that stors the results of expensive function calls and
returns the cached result when the same inputs occur again.

> Note: This helper works both with synchronous and asynchronous functions,
> e.g. Promises.

This library is a cherry-picked mixture of several popular memoisation
libraries to make memoisation both easy and straight forward.

## Requirements

- [Node v10+](node+npm)
- [npm v6+](node+npm)

## Install

```bash
# Using npm
$ npm install memoize-lit

# Using yarn
$ yarn add memoize-lit
```

## Examples

### Synchronous

```js
import { memoize } from 'memoize-lit';

const multiply = (a, b) => a * b;
const memoizedMultiply = memoize(multiply);

memoizedMultiply(2, 3); // 6

memoizedMultiply(2, 3); // 6
// Multiply function is not executed and previous result is returned

memoizedMultiply(1, 3); // 3
// Multiply function is called as arguments have changed

memoizedMultiply(1, 3); // 3
// Multiply function is not executed and previous result is returned

memoizedMultiply(2, 3); // 6
// Multiply function is called as arguments have changed.
```

### Asynchronous

```js
import { memoize } from 'memoize-lit';
import axios from 'axios';

const memoizedAxios = memoize(axios, { maxAge: 100 });

(async () => {
  await memoizedAxios('https://joelvoss.com');

  await memoizedAxios('https://joelvoss.com');
  // Axios is not executed and previous result is returned

  setTimeout(() => {
    await memoizedAxios('https://joelvoss.com');
    // Axios function is called as `maxAge` has expired
  }, 200);
})();
```

## API

### memoize(fn, options?)

Create a memoized version of `fn`. You can provide a custom configuration as
the second argument.

#### fn

Input function to memoize.

```ts
import { memoize } from 'memoize-lit';

// (1) Memoize the `multiply` function
const multiply = (a, b) => a * b;
const memoizedMultiply = memoize(multiply);

// (2) Use it normally
memoizedMultiply(2, 3); // 6
```

#### options

Provide a custom equality function and/or the maxAge time in milliseconds.

```ts
// Signature

type EqualityFn = (newArgs: any[], lastArgs: any[]) => boolean;

type Options = {
  isEqual?: EqualityFn;
  maxAge?: number;
};
```

```ts
import { memoize } from 'memoize-lit';
import axios from 'axios';

// (1) Memoize axios
const memoizedAxios = memoize(axios, { maxAge: 100 });

(async () => {
  // (2) Use it normally
  await memoizedAxios('https://joelvoss.com');
})();
```

The default equality function is a shallow equal check of all arguments
(each argument is compared with ===). If the length of arguments change, then
the default equality function makes no shallow equality checks.

The default `maxAge` value in milliseconds is `2147483647`, which is the
biggest signed 32-bit integer value possible.

## When your function throws or the promise rejects

> In essence: There is no caching if your function throws or is rejected.

If your result function _throws_ then the memoized function will also throw.
This **will not** drop the memoized result. This means that the memoized
function will pretend like it was never called with arguments that made it
throw.

This behaviour is **different** for Promises, because a Promise can
Promises never throw but instead return a rejected state. If a Promise is being
_rejected_, mark it as _stale_ so the next invocation returns a fresh result.

> Note: A rejected promise never overwrites an intermediate successful promise.
> In this case the rejected promise is simply ignored.

This library does not handle promise rejections for you, so always make sure
to wrap a async memmoized function in a `try / catch` block.

## Development

[1] Install dependencies

```bash
# Using npm
$ npm install

# Using yarn
$ yarn
```

[2] Validate setup

```bash
$ ./Taskfile.sh validate
```

[3] Start development by running tests in watch-mode

```bash
$ ./Taskfile.sh test -w
```

---

This project was bootstrapped with [@jvdx/core](https://github.com/joelvoss/jvdx-core).

[node+npm]: https://nodejs.org
