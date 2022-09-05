export type EqualityFn = (newArgs: any[], lastArgs: any[]) => boolean;

export type Options = {
	isEqual?: EqualityFn;
	maxAge?: number;
};

// memoize remembers the latest arguments and result of a given function.
// After `options.maxAge` the cached result is marked as stale.
// This is a modified version of https://github.com/alexreardon/memoize-one
export const memoize = <
	ResultFn extends (this: any, ...newArgs: any[]) => ReturnType<ResultFn>,
>(
	resultFn: ResultFn,
	options: Options = {},
): ResultFn => {
	let isEqual = options.isEqual || areInputsEqual;
	let maxAge = options.maxAge || 2147483647; // milliseconds

	let lastThis: unknown;
	let lastArgs: unknown[] = [];
	let lastResult: ReturnType<ResultFn>;
	let calledOnce = false;
	let stale = false;
	let timer: NodeJS.Timeout;

	// Breaking cache when context or arguments change.
	// Because of `this` (no pun intended), it cannot be written as an
	// arrow-function.
	function memoized(
		this: unknown,
		...newArgs: unknown[]
	): ReturnType<ResultFn> {
		if (
			calledOnce &&
			!stale &&
			lastThis === this &&
			isEqual(newArgs, lastArgs)
		) {
			return lastResult;
		}

		// Doing the lastResult assignment first so that if it throws
		// nothing will be overwritten. This is because throwing durging an
		// assignment aborts the assignment.
		lastResult = resultFn.apply(this, newArgs);
		calledOnce = true;
		lastThis = this;
		lastArgs = newArgs;
		stale = false;

		// Start a timer to mark the `lastResult` as stale after `maxAge`.
		timer = setTimeout(() => {
			stale = true;
		}, maxAge);

		// Allow the node process to exit before the timer ends. This is only
		// relevant server side.
		// @see https://nodejs.org/api/timers.html#timers_immediate_unref
		if (typeof window === 'undefined') {
			timer.unref();
		}

		// If the `lastResult` is a promise, handle its possible rejection and make
		// sure we don't cache it.
		if (lastResult != null && typeof (lastResult as any).then === 'function') {
			const pendingPromise = lastResult as unknown as Promise<
				ReturnType<ResultFn>
			>;
			pendingPromise.then(null, () => {
				// Avoid dropping already resolved promises that settled while this
				// promise was in flight
				if (pendingPromise === lastResult) {
					stale = true;
				}
			});
		}
		return lastResult;
	}

	return memoized as ResultFn;
};

////////////////////////////////////////////////////////////////////////////////

// areInputsEqual tests if two argument inputs are equal
const areInputsEqual = (
	newInputs: unknown[],
	lastInputs: unknown[],
): Boolean => {
	// No checks needed if the inputs length has changed
	if (newInputs.length !== lastInputs.length) {
		return false;
	}

	for (let i = 0; i < newInputs.length; i++) {
		// Using shallow equality check
		if (newInputs[i] !== lastInputs[i]) {
			return false;
		}
	}
	return true;
};
