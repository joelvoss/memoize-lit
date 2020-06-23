import { memoize, asyncMemoize } from '../index';

const delay = (duration: number) => {
  return new Promise(resolve => setTimeout(resolve, duration));
};

describe('memoize', () => {
  it('works', () => {
    let i = 0;
    const fixture = () => i++;
    const memoized = memoize(fixture);
    expect(memoized()).toBe(0);
    expect(memoized()).toBe(0);
    expect(memoized()).toBe(0);
    expect(memoized(undefined)).toBe(0);
    expect(memoized(undefined)).toBe(0);
    expect(memoized('foo')).toBe(1);
    expect(memoized('foo')).toBe(1);
    expect(memoized('foo')).toBe(1);
    expect(memoized('foo', 'bar')).toBe(1);
    expect(memoized('foo', 'bar')).toBe(1);
    expect(memoized('foo', 'bar')).toBe(1);
    expect(memoized(1)).toBe(2);
    expect(memoized(1)).toBe(2);
    expect(memoized(null)).toBe(3);
    expect(memoized(null)).toBe(3);
    expect(memoized(fixture)).toBe(4);
    expect(memoized(fixture)).toBe(4);
    expect(memoized(true)).toBe(5);
    expect(memoized(true)).toBe(5);

    // Ensure that functions are stored by reference and not by "value"
    // (e.g. their `.toString()` representation)
    expect(memoized(() => i++)).toBe(6);
    expect(memoized(() => i++)).toBe(7);
  });

  it(`handles multiple non-primitive arguments`, () => {
    let i = 0;
    const memoized = memoize(() => i++, { cacheKey: JSON.stringify });
    expect(memoized()).toBe(0);
    expect(memoized()).toBe(0);
    expect(memoized({ foo: true }, { bar: false })).toBe(1);
    expect(memoized({ foo: true }, { bar: false })).toBe(1);
    expect(memoized({ foo: true }, { bar: false }, { baz: true })).toBe(2);
    expect(memoized({ foo: true }, { bar: false }, { baz: true })).toBe(2);
  });

  it(`handles Symbol arguments`, () => {
    let i = 0;
    const argument1 = Symbol('fixture1');
    const argument2 = Symbol('fixture2');
    const memoized = memoize(() => i++);
    expect(memoized()).toBe(0);
    expect(memoized()).toBe(0);
    expect(memoized(argument1)).toBe(1);
    expect(memoized(argument1)).toBe(1);
    expect(memoized(argument2)).toBe(2);
    expect(memoized(argument2)).toBe(2);
  });

  it(`handles the cacheKey option`, () => {
    let i = 0;
    const fixture = () => i++;
    const memoized = memoize(fixture, {
      cacheKey: ([firstArgument]) => String(firstArgument),
    });
    expect(memoized(1)).toBe(0);
    expect(memoized(1)).toBe(0);
    expect(memoized('1')).toBe(0);
    expect(memoized('2')).toBe(1);
    expect(memoized(2)).toBe(1);
  });

  it(`handles the maxAge option`, async done => {
    let i = 0;
    const fixture = () => i++;
    const memoized = memoize(fixture, { maxAge: 100 });
    expect(memoized(1)).toBe(0);
    expect(memoized(1)).toBe(0);
    await delay(50);
    expect(memoized(1)).toBe(0);
    await delay(200);
    expect(memoized(1)).toBe(1);
    done();
  });

  it(`handles the cache option`, () => {
    let i = 0;
    const fixture = () => i++;
    const memoized = memoize(fixture, {
      cache: new Map<any, any>(),
      cacheKey: ([firstArgument]) => firstArgument,
    });
    const foo = {};
    const bar = {};
    expect(memoized(foo)).toBe(0);
    expect(memoized(foo)).toBe(0);
    expect(memoized(bar)).toBe(1);
    expect(memoized(bar)).toBe(1);
  });

  it(`deletes old items when maxAge was exceeded`, async done => {
    let i = 0;
    const fixture = () => i++;
    const cache = new Map();
    const deleted: number[] = [];
    const remove = cache.delete.bind(cache);
    cache.delete = item => {
      deleted.push(item);
      return remove(item);
    };

    const memoized = memoize(fixture, { maxAge: 100, cache });
    expect(memoized(1)).toBe(0);
    expect(memoized(1)).toBe(0);
    expect(cache.has(1)).toBe(true);
    await delay(50);
    expect(memoized(1)).toBe(0);
    expect(deleted.length).toBe(0);
    await delay(200);
    expect(memoized(1)).toBe(1);
    expect(deleted.length).toBe(1);
    expect(deleted[0]).toBe(1);
    done();
  });

  it(`deletes old items when maxAge was exceeded even if function throws`, async done => {
    let i = 0;
    const fixture = () => {
      if (i === 1) {
        throw new Error('failure');
      }
      return i++;
    };

    const cache = new Map();
    const memoized = memoize(fixture, { maxAge: 100, cache });
    expect(memoized(1)).toBe(0);
    expect(memoized(1)).toBe(0);
    expect(cache.size).toBe(1);
    await delay(50);
    expect(memoized(1)).toBe(0);
    await delay(200);
    expect(() => memoized(1)).toThrowError('failure');
    expect(cache.size).toBe(0);
    done();
  });

  it(`handles promises`, async done => {
    let i = 0;
    const memoized = memoize(async () => i++);
    await expect(memoized()).resolves.toBe(0);
    await expect(memoized()).resolves.toBe(0);
    await expect(memoized(10)).resolves.toBe(1);
    done();
  });
});

describe(`memoize.clear()`, () => {
  it(`works`, () => {
    let i = 0;
    const fixture = () => i++;
    const memoized = memoize(fixture);
    expect(memoized()).toBe(0);
    expect(memoized()).toBe(0);
    memoize.clear(memoized);
    expect(memoized()).toBe(1);
    expect(memoized()).toBe(1);
  });

  it(`throws when called with a plain function`, () => {
    expect(() => memoize.clear(() => {})).toThrowError(
      `Can't clear a function that was not memoized!`,
    );
  });
});

describe(`asyncMemoize`, () => {
  it(`works`, async done => {
    let i = 0;
    const memoized = asyncMemoize(async () => i++);
    await expect(memoized()).resolves.toBe(0);
    await expect(memoized()).resolves.toBe(0);
    await expect(memoized(10)).resolves.toBe(1);
    done();
  });

  it(`does not memoize rejected promises`, async done => {
    let i = 0;
    const memoized = asyncMemoize(async () => {
      i++;
      if (i === 2) {
        throw new Error('fixture');
      }
      return i;
    });

    await expect(memoized()).resolves.toBe(1);
    await expect(memoized()).resolves.toBe(1);

    await expect(memoized(10)).rejects.toThrowError('fixture');
    await expect(memoized(10)).resolves.toBe(3);

    await expect(memoized(100)).resolves.toBe(4);

    done();
  });

  it(`can memoize rejected promises`, async done => {
    let i = 0;
    const memoized = asyncMemoize(
      async () => {
        i++;
        if (i === 2) {
          throw new Error('fixture');
        }
        return i;
      },
      {
        cachePromiseRejection: true,
      },
    );

    await expect(memoized()).resolves.toBe(1);
    await expect(memoized()).resolves.toBe(1);

    await expect(memoized(10)).rejects.toThrowError('fixture');
    await expect(memoized(10)).rejects.toThrowError('fixture');

    await expect(memoized(100)).resolves.toBe(3);
    done();
  });
});

describe(`asyncMemoize.clear()`, () => {
  it(`works`, () => {
    let i = 0;
    const fixture = () => i++;
    const memoized = asyncMemoize(fixture);
    expect(memoized()).toBe(0);
    expect(memoized()).toBe(0);
    asyncMemoize.clear(memoized);
    expect(memoized()).toBe(1);
    expect(memoized()).toBe(1);
  });

  it(`throws when called with a plain function`, () => {
    expect(() => asyncMemoize.clear(() => {})).toThrowError(
      `Can't clear a function that was not memoized!`,
    );
  });
});
