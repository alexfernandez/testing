/**
 * Testing library: runner for tests.
 * (C) 2013 Alex Fernández.
 */


const GREEN = '\u001b[32m';
const RED = '\u001b[1;31m';
const PURPLE = '\u001b[1;35m';
const BLACK = '\u001b[0m';
const SUCCESS_START = GREEN + '✓ ';
const END = BLACK;
const FAILURE_START = RED + '✕ ';
const UNKNOWN_START = PURPLE + '? ';
const INVALID_START = PURPLE + '??? ';
const SEPARATOR = ': ';
let next = null;


/**
 * A test result.
 */
class TestResult {
	constructor(key) {
		this.key = key;
		this.success = false;
		this.failure = false;
		this.message = null;
		this.finished = false;
	}
	
	/**
	 * Callback for the test result.
	 * Can only be called once.
	 */
	callback(error, result) {
		if (error)
		{
			// only report the first failure
			if (!this.failure)
			{
				this.fail(error);
			}
		}
		else if (!this.failure)
		{
			if (result && result.failure)
			{
				return this.fail(result);
			}
			return this.succeed(result);
		}
	}

	/**
	 * Report a failure.
	 */
	fail(message)
	{
		this.failure = true;
		this.success = false;
		this.message = message;
		console.log(FAILURE_START + this.key + SEPARATOR + message + END);
		this.finished = true;
	}

	/**
	 * Report a success.
	 */
	succeed(message)
	{
		if (this.finished)
		{
			if (this.success)
			{
				message = 'Duplicated call to callback';
			}
			// only one success allowed
			return this.fail(message);
		}
		this.success = true;
		this.message = message;
		console.log(SUCCESS_START + this.key + SEPARATOR + message + END);
		this.finished = true;
	}

	/**
	 * Return a printable representation.
	 */
	toString(indent) {
		let message = this.key;
		if (this.message)
		{
			message += SEPARATOR + this.message;
		}
		return getPrintable(this, message, indent);
	}
}

/**
 * A result that contains other results.
 */
class CompositeResult {
	constructor(key) {
		this.key = key;
		this.success = false;
		this.failure = false;
		this.failures = 0;
		this.results = {};
	}

	/**
	 * Add a sub-result.
	 */
	add(result) {
		this.results[result.key] = result;
		if (result.success && !this.failure)
		{
			this.success = true;
		}
		if (result.failure)
		{
			this.success = false;
			this.failure = true;
		}
	}

	/**
	 * Return a printable representation.
	 */
	toString(indent) {
		indent = indent || 0;
		let message = getPrintable(this, this.key + SEPARATOR, indent) + '\n';
		message += getIndented(indent) + '{\n';
		for (const key in this.results)
		{
			const result = this.results[key];
			message += result.toString(indent + 1) + ',\n';
		}
		message += getIndented(indent) + '}';
		return message;
	}

	/**
	 * Return a shortened representation.
	 */
	getSummary() {
		return getPrintable(this, this.key, 0);
	}
}

/**
 * Get the printable representation for a result, like this:
 * START message END.
 * An optional indent is applied as an equivalent number of tabs.
 */
function getPrintable(result, message, indent)
{
	let start;
	if (!result.failure && !result.success)
	{
		start = UNKNOWN_START;
	}
	else if (result.success && result.failure)
	{
		start = INVALID_START;
	}
	else if (result.success)
	{
		start = SUCCESS_START;
	}
	else
	{
		start = FAILURE_START;
	}
	return getIndented(indent) + start + message + END;
}

/**
 * Get an indented string, with an equivalent number of tabs.
 */
function getIndented(indent)
{
	let indented = '';
	if (indent)
	{
		for (let i = 0; i < indent; i++)
		{
			indented += '\t';
		}
	}
	return indented;
}

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
			else if (typeof value == 'string')
			{
				// it is a file name, with a test function
				const testFunction = this.getFileTest(value);
				if (!testFunction)
				{
					console.error('Cannot get test function from file %s', value);
					return this.deleteAndRunNext(key, callback);
				}
				next = this.getNext(key, value, callback);
				return testFunction(next);
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
	 * Get the test function in a file.
	 */
	getFileTest(filename) {
		try
		{
			const file = require(filename);
			return file.test;
		}
		catch(exception)
		{
			console.error('File %s not found: %s', filename, exception);
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
 * Test to run some functions.
 */
function testRun()
{
	const series = {
		a: function(callback) {
			callback(null, 'a');
		},
		b: {
			e: function(callback) {
				callback('e');
			},
			c: function(callback) {
				callback(null, 'c');
			},
			f: function() {
				throw new Error('exception');
			},
		},
		g: [function(callback) {
			callback(null, 'g0');
		}, function two(callback) {
			callback(null, 'g1');
		}],
		h: ['../index.js', 'shouldNotFindThis.js'],
	};
	run(series, function(error, result)
	{
		console.assert(result.failure, 'Root should be failure');
		console.assert(result.results.a, 'Should have result for a');
		console.assert(result.results.a.success, 'Should have success for a');
		console.assert(result.results.a.message == 'a', 'Should have an a for a');
		console.assert(result.results.b, 'Should have result for b');
		console.assert(result.results.b.failure, 'Should have failure for b');
		console.assert(result.results.b.results.c, 'Should have result for b.c');
		console.assert(result.results.b.results.c.success, 'Should have success for b.c');
		console.assert(result.results.b.results.c.message == 'c', 'Should have a c for b.c');
		console.assert(result.results.b.results.e, 'Should have result for b.e');
		console.assert(result.results.b.results.e.failure, 'Should have failure for b.e');
		console.assert(result.results.b.results.e.message == 'e', 'Should have a e for b.e');
		console.assert(result.results.g, 'Should have result for g');
		console.assert(result.results.g.success, 'Should have success for g');
		console.assert(result.results.g.results[0], 'Should have result for g[0]');
		console.assert(result.results.g.results[0].success, 'Should have success for g[0]');
		console.assert(result.results.g.results[0].message == 'g0', 'Should have g0 for g[0]');
		console.assert(result.results.g.results.two, 'Should have result for two');
		console.assert(result.results.g.results.two.success, 'Should have success for two');
		console.assert(result.results.g.results.two.message == 'g1', 'Should have g1 for two');
		console.log('Test run successful with 2 failures: %s', result);
	});
}

/**
 * Clone a series of functions. Performs a sanity check.
 */
function clone(series)
{
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
 * Test the clone function.
 */
function testClone()
{
	const original = {
		a: function() {},
		b: {
			c: function() {},
		},
	};
	const cloned = clone(original);
	console.assert(cloned.a, 'Cloned object should have function property');
	console.assert(typeof cloned.a == 'function', 'Cloned object should have function');
	console.assert(cloned.b, 'Cloned object should have object property');
	console.assert(typeof cloned.b == 'object', 'Cloned object should have object');
	console.assert(cloned.b.c, 'Cloned object should have sub-object property');
	console.assert(typeof cloned.b.c == 'function', 'Cloned object should have sub-object');
}

/**
 * Find out if the object is empty.
 */
function isEmpty(object)
{
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
 * Test the empty function.
 */
function testEmpty()
{
	console.assert(isEmpty({}), 'Empty object should be empty');
	console.assert(!isEmpty({a: 'a'}), 'Not empty object is empty');
	console.assert(isEmpty([]), 'Empty array should be empty');
	console.assert(!isEmpty(['a']), 'Not empty array is empty');
}

/**
 * Find out if the argument is a number.
 * http://stackoverflow.com/a/1830844/978796
 */
function isNumber(n)
{
	return !isNaN(parseFloat(n)) && isFinite(n);
}

