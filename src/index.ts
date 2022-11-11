type EqualityFn<TFunc extends (...args: any[]) => any> = (
	newArgs: Parameters<TFunc>,
	lastArgs: Parameters<TFunc>,
) => boolean;

type Options<TFunc extends (...args: any[]) => any> = {
	isEqual?: EqualityFn<TFunc>;
	maxAge?: number;
};

/**
 * memoize remembers the latest arguments and result of a given function.
 * After `options.maxAge` the cached result is marked as stale.
 * This is a modified version of https://github.com/alexreardon/memoize-one
 */
export function memoize<
	ResultFn extends (this: any, ...newArgs: any[]) => ReturnType<ResultFn>,
>(resultFn: ResultFn, options: Options<ResultFn> = {}) {
	let isEqual = options.isEqual || areInputsEqual;
	let maxAge = options.maxAge || 2147483647; // milliseconds

	let lastThis: ThisParameterType<ResultFn>;
	let lastArgs: Parameters<ResultFn>;
	let lastResult: ReturnType<ResultFn>;
	let calledOnce = false;
	let stale = false;
	let timer: NodeJS.Timeout;

	// NOTE(joel): Breaking cache when context or arguments change.
	// Because of `this` (no pun intended), it cannot be written as an
	// arrow-function.
	function memoized(
		this: ThisParameterType<ResultFn>,
		...newArgs: Parameters<ResultFn>
	) {
		if (
			calledOnce &&
			!stale &&
			lastThis === this &&
			isEqual(newArgs, lastArgs)
		) {
			return lastResult;
		}

		// NOTE(joel): Doing the lastResult assignment first so that if it throws
		// nothing will be overwritten. This is because throwing during an
		// assignment aborts the assignment.
		lastResult = resultFn.apply(this, newArgs);
		calledOnce = true;
		lastThis = this;
		lastArgs = newArgs;
		stale = false;

		// NOTE(joel): Start a timer to mark the `lastResult` as stale after
		// `maxAge`.
		timer = setTimeout(() => {
			stale = true;
		}, maxAge);

		// NOTE(joel): Allow the node process to exit before the timer ends. This
		// is only relevant server side.
		// @see https://nodejs.org/api/timers.html#timers_immediate_unref
		if (typeof window === 'undefined') {
			timer.unref();
		}

		// NOTE(joel): If the `lastResult` is a promise, handle its possible
		// rejection and make sure we don't cache it.
		if (lastResult != null && typeof (lastResult as any).then === 'function') {
			const pendingPromise = lastResult as unknown as Promise<
				ReturnType<ResultFn>
			>;
			pendingPromise.then(null, () => {
				// NOTE(joel): Avoid dropping already resolved promises that settled
				// while this promise was in flight.
				if (pendingPromise === lastResult) {
					stale = true;
				}
			});
		}
		return lastResult;
	}

	return memoized as ResultFn;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * Number.isNaN as it is not supported in IE11 so conditionally using ponyfill.
 * Using Number.isNaN where possible as it is ~10% faster.
 */
const safeIsNaN =
	Number.isNaN ||
	function ponyfill(value) {
		// NOTE(joel): NaN is the only value in JavaScript which is not equal to
		// itself.
		return typeof value === 'number' && value !== value;
	};

////////////////////////////////////////////////////////////////////////////////

/**
 * areInputsEqual tests if two argument inputs are equal
 */
function areInputsEqual(newInputs: unknown[], lastInputs: unknown[]) {
	// NOTE(joel): No checks needed if the inputs length has changed.
	if (newInputs.length !== lastInputs.length) {
		return false;
	}

	for (let i = 0; i < newInputs.length; i++) {
		if (newInputs[i] === lastInputs[i]) continue;
		// NOTE(joel): Special case for NaN (NaN !== NaN).
		if (safeIsNaN(newInputs[i]) && safeIsNaN(lastInputs[i])) continue;

		return false;
	}
	return true;
}
