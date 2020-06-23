import mapAgeCleaner from 'map-age-cleaner';

const cacheStore = new WeakMap();
const memoizedFunctions = new WeakMap();

////////////////////////////////////////////////////////////////////////////////

export type Options<Arguments extends unknown[], CacheKey> = {
  cache?: Map<any, { data: any; maxAge: number }>;
  cacheKey?: (args: Arguments) => CacheKey;
  maxAge?: number;
};

////////////////////////////////////////////////////////////////////////////////

/**
 * `memoize` takes in a function and returns a memoized version.
 * By default, the first argument is taken as the cache key.
 */
export const memoize = <Arguments extends unknown[], CacheKey>(
  fn: Function,
  options?: Options<Arguments, CacheKey>,
) => {
  const { cache, cacheKey, maxAge } = {
    cache: new Map(),
    ...options,
  };

  if (typeof maxAge === 'number') {
    mapAgeCleaner(cache);
  }

  const memoized = function (this: any, ...args: Arguments): any {
    const key = cacheKey ? cacheKey(args) : args[0];

    const cacheItem = cache.get(key);
    if (cacheItem) {
      return cacheItem.data;
    }

    const result = fn.apply(this, args);

    cache.set(key, {
      data: result,
      maxAge: maxAge ? Date.now() + maxAge : Infinity,
    });

    return result;
  };

  cacheStore.set(memoized, cache);

  return memoized;
};

////////////////////////////////////////////////////////////////////////////////

/**
 * `clear` forcefully clears the memoize cache.
 */
memoize.clear = (fn: Function) => {
  if (!cacheStore.has(fn)) {
    throw new Error(`Can't clear a function that was not memoized!`);
  }

  const cache = cacheStore.get(fn);
  if (typeof cache.clear === 'function') {
    cache.clear();
  }
};

////////////////////////////////////////////////////////////////////////////////

export type pOptions<Arguments extends unknown[], CacheKey> = {
  cache?: Map<any, { data: any; maxAge: number }>;
  cacheKey?: (args: Arguments) => CacheKey;
  maxAge?: number;
  cachePromiseRejection?: Boolean;
};

////////////////////////////////////////////////////////////////////////////////

/**
 * `pMemoize` returns a memoized version of the `fn` function.
 * It is a thin wrapper around the base `memoize` function witn the addition
 * to automatically remove rejected promises from the cache.
 */
export const asyncMemoize = <Arguments extends unknown[], CacheKey>(
  fn: Function,
  options?: pOptions<Arguments, CacheKey>,
) => {
  const { cache, cacheKey, cachePromiseRejection, maxAge } = {
    cache: new Map(),
    cacheKey: ([firstArgument]: Arguments) => firstArgument,
    cachePromiseRejection: false,
    ...options,
  };

  const memoized = memoize(fn, {
    cache,
    cacheKey,
    maxAge,
  });

  const memoizedAdapter = function (this: any, ...args: Arguments) {
    const cacheItem = memoized.apply(this, args);

    if (!cachePromiseRejection && cacheItem && cacheItem.catch) {
      cacheItem.catch(() => {
        cache.delete(cacheKey(args));
      });
    }

    return cacheItem;
  };

  memoizedFunctions.set(memoizedAdapter, memoized);

  return memoizedAdapter;
};

////////////////////////////////////////////////////////////////////////////////

/**
 * clear forcefully clears the `pMemoize` cache.
 */
asyncMemoize.clear = (memoized: Function) => {
  if (!memoizedFunctions.has(memoized)) {
    throw new Error(`Can't clear a function that was not memoized!`);
  }

  memoize.clear(memoizedFunctions.get(memoized));
};
