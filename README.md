# lit-memoize

Memoize functions (including promise-returning & async functions).  
Useful for speeding up consecutive function calls by caching the result of
calls with identical input.

Memory is automatically released when an item expires or the cache is cleared.  
By default, only the first argument is considered and it only works with
primitives.

## Requirements

- [Node v10+](node+npm)
- [npm v6+](node+npm)

## Install

```bash
# Using npm
$ npm install lit-memoize

# Using yarn
$ yarn add lit-memoize
```

## Usage

```js
import { asyncMemoize } from 'lit-memoize';
import axios from 'axios';

// 1️⃣ Create memoized version of your function
const memoizedAxios = asyncMemoize(axios, { maxAge: 1000 });

(async () => {
  // 2️⃣ Use it as you normally would.
  // Consecutive calls are automatically cached.
  memoizedAxios('https://joelvoss.com');

  // This request is memoized/cached
  memoizedAxios('https://joelvoss.com');

  setTimeout(() => {
    // This call is not cached as the cache has expired.
    memGot('https://joelvoss.com');
  }, 2000);
})();
```

## API

TBD

### memoize

### memoize.clear

### asyncMemoize

### asyncMemoize.clear


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

This project was bootstrapped with [jvdx](https://github.com/joelvoss/jvdx).

[node+npm]: https://nodejs.org