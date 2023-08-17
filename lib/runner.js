import {TestResult, CompositeResult} from './result.js'

let next = null;


/**
 * Run a series of functions sequentially. Parameters:
 *	- param: an indexed object with functions, or with nested indexed objects.
 *	- callback: a function(error, result) to pass an indexed object with the results.
 */
export function runAll(param, callback) {
	const series = clone(param);
	// uncaught exceptions
	process.on('uncaughtException', uncaughtException);
	const runner = new Runner('main', series);
	runner.runAll(function(error, result)
	{
		process.removeListener('uncaughtException', uncaughtException);
		if (result && result.failure)
		{
			result.key = 'failure';
			return callback(result);
		}
		callback(error, result);
	});
}

/**
 * Process an uncaught exception.
 */
function uncaughtException(error)
{
	if (!next)
	{
		return console.error('Exception without next text');
	}
	next('Uncaught exception: ' + error.stack);
}

/**
 * A runner for a series of tests.
 */
class Runner {
	constructor(name, series) {
		this.name = name
		this.series = series
		this.result = new CompositeResult(name);
		this.finished = false;
	}

	/**
	 * Run all functions in the series, one by one.
	 */
	runAll(callback) {
		this.result.start()
		this.runOne((error, result) => {
			if (error)
			{
				console.error('Error in test %s: %s', this.name, error);
			}
			if (result)
			{
				console.log('Finished test %s: %s', this.name, result.getSummary());
			}
			if (this.finished)
			{
				return;
			}
			this.result.finish()
			this.finished = true;
			callback(error, result);
		})
	}

	/**
	 * Run one function in the given series, go to the next.
	 */
	runOne(callback) {
		if (isEmpty(this.series))
		{
			return callback(null, this.result);
		}
		for (const key in this.series)
		{
			const value = this.series[key];
			if (!value)
			{
				return callback('Empty test for ' + key);
			}
			else if (typeof value == 'object')
			{
				const runner = new Runner(key, value);
				return runner.runAll(error => {
					if (error)
					{
						console.error('Could not run all functions');
						return;
					}
					this.result.add(runner.result);
					this.deleteAndRunNext(key, callback);
				});
			}
			else if (typeof value == 'function')
			{
				let testName = key;
				if (isNumber(key) && value.name)
				{
					testName = value.name;
				}
				// it is a function to run
				next = this.getNext(key, testName, callback);
				if (value.length == 0) {
					return value().then(result => next(null, result)).catch(error => next(error))

				} else {
					return value(next);
				}
			}
			else
			{
				console.error('Key %s has an invalid value %s', key, value);
				return this.deleteAndRunNext(key, callback);
			}
			// only the first element in the series is used;
			// the rest are called by recursion in deleteAndRunNext()
		}
	}

	/**
	 * Get a function to call after a test.
	 */
	getNext(key, name, callback) {
		const testResult = new TestResult(name);
		return (error, result) => {
			testResult.callback(error, result);
			this.result.add(testResult);
			this.deleteAndRunNext(key, callback);
		}
	}

	/**
	 * Delete the current function, run the next.
	 */
	deleteAndRunNext(key, callback) {
		if (!(key in this.series))
		{
			// already run
			return;
		}
		delete this.series[key];
		let defer = process.nextTick;
		if (typeof setImmediate != 'undefined')
		{
			// node v0.10.x
			defer = setImmediate;
		}
		return defer(() => {
			this.runOne(callback);
		})
	}
}

/**
 * Clone a series of functions. Performs a sanity check.
 */
export function clone(series) {
	if (typeof series != 'object')
	{
		console.error('Invalid series %s', JSON.stringify(series));
		return;
	}
	const copy = {};
	for (const key in series)
	{
		const value = series[key];
		if (typeof value == 'function' || typeof value == 'string')
		{
			copy[key] = value;
		}
		else
		{
			copy[key] = clone(value);
		}
	}
	return copy;
}

/**
 * Find out if the object is empty.
 */
export function isEmpty(object) {
	for (const key in object)
	{
		if (object[key])
		{
			return false;
		}
	}
	return true;
}

/**
 * Find out if the argument is a number.
 * http://stackoverflow.com/a/1830844/978796
 */
function isNumber(n)
{
	return !isNaN(parseFloat(n)) && isFinite(n);
}

