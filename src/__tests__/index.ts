import { memoize, EqualityFn } from '../index';

function getA(this: { a: number } | null | undefined): number {
  if (this == null) {
    throw new TypeError();
  }
  return this.a;
}

let delay = (duration: number) => {
  return new Promise(resolve => setTimeout(resolve, duration));
};

describe('baseline', () => {
  let mock: jest.Mock;
  let asyncMock: jest.Mock<Promise<number>, [number, number]>;

  let memoized: jest.Mock;
  let asyncMemoized: jest.Mock;

  beforeEach(() => {
    mock = jest.fn((a: number, b: number): number => a + b);
    memoized = memoize(mock);

    asyncMock = jest.fn(
      (a: number, b: number): Promise<number> =>
        new Promise(resolve => resolve(a + b)),
    );
    asyncMemoized = memoize(asyncMock);
  });

  it(`should return the result of a function`, () => {
    expect(memoized(1, 2)).toBe(3);

    expect(asyncMemoized(1, 2)).resolves.toBe(3);
  });

  it(`should return the same result if the arguments have not changed`, () => {
    expect(memoized(1, 2)).toBe(3);
    expect(memoized(1, 2)).toBe(3);

    expect(asyncMemoized(1, 2)).resolves.toBe(3);
    expect(asyncMemoized(1, 2)).resolves.toBe(3);
  });

  it(`should not execute the memoized function if the arguments have not changed`, () => {
    memoized(1, 2);
    memoized(1, 2);
    expect(mock).toHaveBeenCalledTimes(1);

    expect(asyncMemoized(1, 2)).resolves.toBe(3);
    expect(asyncMemoized(1, 2)).resolves.toBe(3);
    expect(asyncMock).toHaveBeenCalledTimes(1);
  });

  it(`should invalidate a memoize cache if new arguments are provided`, () => {
    expect(memoized(1, 2)).toBe(3);
    expect(memoized(2, 2)).toBe(4);
    expect(mock).toHaveBeenCalledTimes(2);

    expect(asyncMemoized(1, 2)).resolves.toBe(3);
    expect(asyncMemoized(2, 2)).resolves.toBe(4);
    expect(asyncMock).toHaveBeenCalledTimes(2);
  });

  it(`should resume memoization after a cache invalidation`, () => {
    expect(memoized(1, 2)).toBe(3);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(memoized(2, 2)).toBe(4);
    expect(mock).toHaveBeenCalledTimes(2);
    expect(memoized(2, 2)).toBe(4);
    expect(mock).toHaveBeenCalledTimes(2);

    expect(asyncMemoized(1, 2)).resolves.toBe(3);
    expect(asyncMock).toHaveBeenCalledTimes(1);
    expect(asyncMemoized(2, 2)).resolves.toBe(4);
    expect(asyncMock).toHaveBeenCalledTimes(2);
    expect(asyncMemoized(2, 2)).resolves.toBe(4);
    expect(asyncMock).toHaveBeenCalledTimes(2);
  });
});

describe('all the types', () => {
  type Expectation = {
    args: unknown[];
    result: unknown;
  };

  type Input = {
    name: string;
    first: Expectation;
    second: Expectation;
  };

  const inputs: Input[] = [
    {
      name: 'null',
      first: {
        args: [null, null],
        result: true,
      },
      second: {
        args: [null],
        result: false,
      },
    },
    {
      name: 'undefined',
      first: {
        args: [],
        result: true,
      },
      second: {
        args: [undefined, undefined],
        result: false,
      },
    },
    {
      name: 'boolean',
      first: {
        args: [true, false],
        result: true,
      },
      second: {
        args: [false, true],
        result: false,
      },
    },
    {
      name: 'number',
      first: {
        args: [1, 2],
        result: 3,
      },
      second: {
        args: [1, 5],
        result: 6,
      },
    },
    {
      name: 'string',
      first: {
        args: ['hi', 'there'],
        result: 'greetings',
      },
      second: {
        args: ['luke', 'skywalker'],
        result: 'starwars',
      },
    },

    {
      name: 'object: different values and references',
      first: {
        args: [{ foo: 'bar' }],
        result: { baz: 'bar' },
      },
      second: {
        args: [{ bar: 'test' }],
        result: { baz: true },
      },
    },
    {
      name: 'object: same values but different references',
      first: {
        args: [{ foo: 'bar' }],
        result: { baz: 'bar' },
      },
      second: {
        args: [{ foo: 'bar' }],
        result: { baz: 'bar' },
      },
    },
    {
      name: 'symbols',
      first: {
        args: [Symbol('first')],
        result: true,
      },
      second: {
        args: [Symbol('second')],
        result: false,
      },
    },
  ];

  const isShallowEqual = (arr1: any[], arr2: any[]): boolean => {
    if (arr1 === arr2) return true;
    return (
      arr1.length === arr2.length && arr1.every((item, i) => arr2[i] === item)
    );
  };

  inputs.forEach(({ name, first, second }) => {
    describe(`type: ${name}`, () => {
      let mock: (...args: any[]) => unknown;
      let memoized: (...args: any[]) => unknown;
      let asyncMock: (...args: any[]) => unknown;
      let asyncMemoized: (...args: any[]) => unknown;

      beforeEach(() => {
        mock = jest.fn((...args) => {
          if (isShallowEqual(args, first.args)) {
            return first.result;
          }
          if (isShallowEqual(args, second.args)) {
            return second.result;
          }
          throw new Error('unmatched argument');
        });
        memoized = memoize(mock);
        asyncMock = jest.fn((...args) => {
          if (isShallowEqual(args, first.args)) {
            return new Promise(resolve => resolve(first.result));
          }
          if (isShallowEqual(args, second.args)) {
            return new Promise(resolve => resolve(second.result));
          }
          throw new Error('unmatched argument');
        });
        asyncMemoized = memoize(asyncMock);
      });

      it('should return the result of a function', () => {
        expect(memoized(...first.args)).toEqual(first.result);

        expect(asyncMemoized(...first.args)).resolves.toEqual(first.result);
      });

      it('should return the same result if the arguments have not changed', () => {
        expect(memoized(...first.args)).toEqual(first.result);
        expect(memoized(...first.args)).toEqual(first.result);

        expect(asyncMemoized(...first.args)).resolves.toEqual(first.result);
        expect(asyncMemoized(...first.args)).resolves.toEqual(first.result);
      });

      it('should not execute the memoized function if the arguments have not changed', async done => {
        memoized(...first.args);
        memoized(...first.args);
        expect(mock).toHaveBeenCalledTimes(1);

        await asyncMemoized(...first.args);
        await asyncMemoized(...first.args);
        expect(asyncMock).toHaveBeenCalledTimes(1);
        done();
      });

      it('should invalidate a memoize cache if new arguments are provided', () => {
        expect(memoized(...first.args)).toEqual(first.result);
        expect(memoized(...second.args)).toEqual(second.result);
        expect(mock).toHaveBeenCalledTimes(2);

        expect(asyncMemoized(...first.args)).resolves.toEqual(first.result);
        expect(asyncMemoized(...second.args)).resolves.toEqual(second.result);
        expect(asyncMock).toHaveBeenCalledTimes(2);
      });

      it('should resume memoization after a cache invalidation', () => {
        expect(memoized(...first.args)).toEqual(first.result);
        expect(mock).toHaveBeenCalledTimes(1);
        expect(memoized(...second.args)).toEqual(second.result);
        expect(mock).toHaveBeenCalledTimes(2);
        expect(memoized(...second.args)).toEqual(second.result);
        expect(mock).toHaveBeenCalledTimes(2);

        expect(asyncMemoized(...first.args)).resolves.toEqual(first.result);
        expect(asyncMock).toHaveBeenCalledTimes(1);
        expect(asyncMemoized(...second.args)).resolves.toEqual(second.result);
        expect(asyncMock).toHaveBeenCalledTimes(2);
        expect(asyncMemoized(...second.args)).resolves.toEqual(second.result);
        expect(asyncMock).toHaveBeenCalledTimes(2);
      });
    });
  });
});

describe('memoize - respecting "this" context', () => {
  describe('original function', () => {
    it('should respect new bindings', () => {
      const Foo = function (this: { bar: string }, bar: string) {
        this.bar = bar;
      };
      const memoized = memoize(function (bar) {
        // @ts-ignore
        return new Foo(bar);
      });

      const result = memoized('baz');
      expect(result instanceof Foo).toBe(true);
      expect(result.bar).toBe('baz');
    });

    it('should respect explicit bindings', () => {
      const memoized = memoize(function () {
        return getA.call({ a: 10 });
      });
      expect(memoized()).toBe(10);
    });

    it('should respect hard bindings', () => {
      const memoized = memoize(getA.bind({ a: 20 }));
      expect(memoized()).toBe(20);
    });

    it('should respect implicit bindings', () => {
      const temp = { a: 2, getA };
      const memoized = memoize(function () {
        return temp.getA();
      });
      expect(memoized()).toBe(2);
    });

    it('should respect fat arrow bindings', () => {
      function foo() {
        // return an arrow function
        return (): number => {
          // `this` here is lexically adopted from `foo()`
          // @ts-ignore
          return getA.call(this);
        };
      }
      const bound = foo.call({ a: 50 });
      const memoized = memoize(bound);
      expect(memoized()).toBe(50);
    });

    it('should respect ignored bindings', () => {
      const bound = getA.bind(null);
      const memoized = memoize(bound);
      expect(memoized).toThrow(TypeError);
    });
  });

  describe('memoized function', () => {
    it('should respect new bindings', () => {
      const memoizedGetA = memoize(getA);
      interface FooInterface {
        a: number;
        result: number;
      }

      const Foo = function (this: FooInterface, a: number): void {
        this.a = a;
        this.result = memoizedGetA.call(this);
      };

      // @ts-ignore
      const foo1 = new Foo(10);
      // @ts-ignore
      const foo2 = new Foo(20);

      expect(foo1.result).toBe(10);
      expect(foo2.result).toBe(20);
    });

    it('should respect implicit bindings', () => {
      const getAMemoized = memoize(getA);
      const temp = {
        a: 5,
        getAMemoized,
      };

      expect(temp.getAMemoized()).toBe(5);
    });

    it('should respect explicit bindings', () => {
      const memoized = memoize(getA);
      expect(memoized.call({ a: 10 })).toBe(10);
    });

    it('should respect hard bindings', () => {
      const getAMemoized = memoize(getA).bind({ a: 20 });
      expect(getAMemoized()).toBe(20);
    });

    it('should memoize hard bound memoized functions', () => {
      const spy = jest.fn(getA);
      const getAMemoized = memoize(spy).bind({ a: 40 });

      expect(getAMemoized()).toBe(40);
      expect(getAMemoized()).toBe(40);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should respect implicit bindings', () => {
      const getAMemoized = memoize(getA);
      const temp = {
        a: 2,
        getAMemoized,
      };

      expect(temp.getAMemoized()).toBe(2);
    });

    it('should respect fat arrow bindings', () => {
      const memoizedGetA = memoize(getA);
      function foo() {
        // return an arrow function
        return (): number => {
          // `this` here is lexically adopted from `foo()`
          // @ts-ignore
          return memoizedGetA.call(this);
        };
      }
      const bound = foo.call({ a: 50 });
      const memoized = memoize(bound);

      expect(memoized()).toBe(50);
    });

    it('should respect ignored bindings', () => {
      const memoized = memoize(getA);
      const getResult = function (): number {
        return memoized.call(null);
      };
      expect(getResult).toThrow(TypeError);
    });
  });
});

describe('context change', () => {
  it('should break the memoization cache if the execution context changes', () => {
    const memoized = memoize(getA);
    const temp1 = {
      a: 20,
      getMemoizedA: memoized,
    };
    const temp2 = {
      a: 30,
      getMemoizedA: memoized,
    };

    expect(temp1.getMemoizedA()).toBe(20);
    expect(temp2.getMemoizedA()).toBe(30);
  });
});

describe('skip equality check', () => {
  it('should not run any equality checks if the "this" context changes', () => {
    const isEqual = jest.fn().mockReturnValue(true);
    const memoized = memoize(getA, { isEqual });
    // custom equality function not called on first call
    expect(memoized.apply({ a: 10 })).toBe(10);
    expect(isEqual).not.toHaveBeenCalled();

    // not executed as "this" context has changed
    expect(memoized.apply({ a: 20 })).toBe(20);
    expect(isEqual).not.toHaveBeenCalled();
  });

  it('should run a custom equality check if the arguments length changes', () => {
    const mock = jest.fn();
    const isEqual = jest.fn().mockReturnValue(true);
    const memoized = memoize(mock, { isEqual });

    memoized(1, 2);
    // not executed on original call
    expect(isEqual).not.toHaveBeenCalled();

    // executed even though argument length has changed
    memoized(1, 2, 3);
    expect(isEqual).toHaveBeenCalled();
  });
});

describe('custom equality function', () => {
  type Mock = (a: number, b: number) => number;

  let mock: Mock;
  let memoized: Mock;
  let equalityStub: EqualityFn;

  beforeEach(() => {
    mock = jest.fn((value1: number, value2: number): number => value1 + value2);
    equalityStub = jest.fn();
    memoized = memoize(mock, { isEqual: equalityStub });
  });

  it('should call the equality function with the newArgs, lastArgs and lastValue', () => {
    (equalityStub as jest.Mock).mockReturnValue(true);

    // first call does not trigger equality check
    memoized(1, 2);
    expect(equalityStub).not.toHaveBeenCalled();
    memoized(1, 4);

    expect(equalityStub).toHaveBeenCalledWith([1, 4], [1, 2]);
  });

  it('should return the previous value without executing the result fn if the equality fn returns true', () => {
    (equalityStub as jest.Mock).mockReturnValue(true);

    // hydrate the first value
    const first: number = memoized(1, 2);
    expect(first).toBe(3);
    expect(mock).toHaveBeenCalledTimes(1);

    // equality test should not be called yet
    expect(equalityStub).not.toHaveBeenCalled();

    // normally would return false - but our custom equality function returns
    // true
    const second = memoized(4, 10);

    expect(second).toBe(3);
    // equality test occured
    expect(equalityStub).toHaveBeenCalled();
    // underlying function not called
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('should return execute and return the result of the result fn if the equality fn returns false', () => {
    (equalityStub as jest.Mock).mockReturnValue(false);

    // hydrate the first value
    const first: number = memoized(1, 2);
    expect(first).toBe(3);
    expect(mock).toHaveBeenCalledTimes(1);

    // equality test should not be called yet
    expect(equalityStub).not.toHaveBeenCalled();

    const second = memoized(4, 10);

    expect(second).toBe(14);
    // equality test occured
    expect(equalityStub).toHaveBeenCalled();
    // underlying function called
    expect(mock).toHaveBeenCalledTimes(2);
  });
});

describe('throwing / rejecting', () => {
  it('should throw when the memoized function throws', () => {
    const willThrow = (message: string): never => {
      throw new Error(message);
    };
    const memoized = memoize(willThrow);

    expect(memoized).toThrow();
  });

  it('should not memoize a thrown result', () => {
    const willThrow = jest.fn((message: string) => {
      throw new Error(message);
    });
    const memoized = memoize(willThrow);
    let firstError;
    let secondError;

    try {
      memoized('hello');
    } catch (e) {
      firstError = e;
    }

    try {
      memoized('hello');
    } catch (e) {
      secondError = e;
    }

    expect(willThrow).toHaveBeenCalledTimes(2);
    expect(firstError).toEqual(Error('hello'));
    expect(firstError).not.toBe(secondError);
  });

  it('should not memoize a rejected result', async done => {
    const willReject = jest.fn((message: string) => {
      return new Promise((_, reject) => reject(new Error(message)));
    });
    const memoized = memoize(willReject);
    let firstError;
    let secondError;

    try {
      await memoized('hello');
    } catch (e) {
      firstError = e;
    }

    try {
      await memoized('hello');
    } catch (e) {
      secondError = e;
    }

    expect(willReject).toHaveBeenCalledTimes(2);
    expect(firstError).toEqual(Error('hello'));
    expect(firstError).not.toBe(secondError);
    done();
  });

  it('should not break the memoization cache of a successful call', () => {
    const canThrow = jest.fn((shouldThrow: boolean) => {
      if (shouldThrow) {
        throw new Error('hey friend');
      }
      // will return a new object reference each time
      return { hello: 'world' };
    });
    const memoized = memoize(canThrow);
    let firstError;
    let secondError;

    // standard memoization
    const result1 = memoized(false);
    const result2 = memoized(false);
    expect(result1).toBe(result2);
    expect(canThrow).toHaveBeenCalledTimes(1);
    canThrow.mockClear();

    // a call that throws
    try {
      memoized(true);
    } catch (e) {
      firstError = e;
    }

    expect(canThrow).toHaveBeenCalledTimes(1);
    canThrow.mockClear();

    // call with last successful arguments has not had its cache busted
    const result3 = memoized(false);
    expect(canThrow).not.toHaveBeenCalled();
    expect(result3).toBe(result2);
    canThrow.mockClear();

    // now going to throw again
    try {
      memoized(true);
    } catch (e) {
      secondError = e;
    }

    // underlying function is called
    expect(canThrow).toHaveBeenCalledTimes(1);
    expect(firstError).toEqual(secondError);
    expect(firstError).not.toBe(secondError);
    canThrow.mockClear();

    // last successful cache value is not lost and result fn not called
    const result4 = memoized(false);
    expect(canThrow).not.toHaveBeenCalled();
    expect(result4).toBe(result3);
  });

  it('should throw regardless of the type of the thrown value', () => {
    const values: unknown[] = [
      null,
      undefined,
      true,
      false,
      10,
      'hi',
      { name: 'Alex' },
      Symbol('sup'),
    ];

    values.forEach((value: unknown) => {
      const throwValue = jest.fn(() => {
        throw value;
      });
      const memoized = memoize(throwValue);
      let firstError;
      let secondError;

      try {
        memoized();
      } catch (e) {
        firstError = e;
      }

      try {
        memoized();
      } catch (e) {
        secondError = e;
      }

      // no memoization
      expect(firstError).toEqual(value);

      // validation - no memoization
      expect(throwValue).toHaveBeenCalledTimes(2);
      expect(firstError).toEqual(secondError);
    });
  });

  it('should not drop resolved promises that settled while a rejected one was in flight', async done => {
    const willReject = jest.fn((key: string) => {
      if (key === 'reject') {
        return new Promise((_, reject) => reject(new Error(key)));
      }
      return new Promise(resolve => resolve(key));
    });

    const memoized = memoize(willReject);

    // hydrate the first value
    await memoized('resolve');

    // this promise will reject after 100ms
    try {
      memoized('reject');
    } catch (e) {}

    // in the meantime, issue another promise that resolves
    const result1 = await memoized('resolve');
    willReject.mockClear();

    // delay executing so the pending promise that will reject has time to
    // settle
    await delay(200);

    // even after rejecting an interim promise the subsequent resolved
    // promises are cached
    const result2 = await memoized('resolve');
    const result3 = await memoized('resolve');
    expect(willReject).not.toBeCalled();
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);

    const result4 = await memoized('you');
    expect(willReject).toHaveBeenCalledTimes(1);
    expect(result3).not.toBe(result4);
    done();
  });
});

describe('maxAge option', () => {
  let mock: jest.Mock<Promise<number>, [number, number]>;
  let memoized: jest.Mock;

  beforeEach(() => {
    mock = jest.fn(
      (a: number, b: number): Promise<number> =>
        new Promise(resolve => resolve(a + b)),
    );
    memoized = memoize(mock, { maxAge: 100 });
  });

  it('should break the memoization cache if maxAge elapsed', async done => {
    expect(memoized(1, 2)).resolves.toBe(3);
    expect(memoized(1, 2)).resolves.toBe(3);

    await delay(50);

    expect(memoized(1, 2)).resolves.toBe(3);
    expect(mock).toHaveBeenCalledTimes(1);

    await delay(200);

    expect(memoized(1, 2)).resolves.toBe(3);
    expect(memoized(1, 2)).resolves.toBe(3);
    expect(mock).toHaveBeenCalledTimes(2);
    done();
  });
});
