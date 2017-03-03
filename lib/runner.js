'use strict';

/**
 * Testing library: runner for tests.
 * (C) 2013 Alex Fernández.
 */


// requires
var Log = require('log');

// globals
var log = new Log('info');
var next;


// constants
var GREEN = '\u001b[32m';
var RED = '\u001b[1;31m';
var PURPLE = '\u001b[1;35m';
var BLACK = '\u001b[0m';
var SUCCESS_START = GREEN + '✓ ';
var END = BLACK;
var FAILURE_START = RED + '✕ ';
var UNKNOWN_START = PURPLE + '? ';
var INVALID_START = PURPLE + '??? ';
var SEPARATOR = ': ';


/**
 * A test result.
 */
var TestResult = function(key)
{
	// self-reference
	var self = this;

	// attributes
	self.key = key;
	self.success = false;
	self.failure = false;
	self.message = null;
	var finished = false;
	
	/**
	 * Callback for the test result.
	 * Can only be called once.
	 */
	self.callback = function(error, result)
	{
		if (error)
		{
			// only report the first failure
			if (!self.failure)
			{
				fail(error);
			}
		}
		else if (!self.failure)
		{
			if (result && result.failure)
			{
				return fail(result);
			}
			return succeed(result);
		}
	};

	/**
	 * Report a failure.
	 */
	function fail(message)
	{
		self.failure = true;
		self.success = false;
		self.message = message;
		console.log(FAILURE_START + self.key + SEPARATOR + message + END);
		finished = true;
	}

	/**
	 * Report a success.
	 */
	function succeed(message)
	{
		if (finished)
		{
			if (self.success)
			{
				message = 'Duplicated call to callback';
			}
			// only one success allowed
			return fail(message);
		}
		self.success = true;
		self.message = message;
		console.log(SUCCESS_START + self.key + SEPARATOR + message + END);
		finished = true;
	}

	/**
	 * Return a printable representation.
	 */
	self.toString = function(indent)
	{
		var message = self.key;
		if (self.message)
		{
			message += SEPARATOR + self.message;
		}
		return getPrintable(self, message, indent);
	};
};

/**
 * A result that contains other results.
 */
var CompositeResult = function(key)
{
	// self-reference
	var self = this;

	// attributes
	self.key = key;
	self.success = false;
	self.failure = false;
	self.failures = 0;
	self.results = {};

	/**
	 * Add a sub-result.
	 */
	self.add = function(result)
	{
		self.results[result.key] = result;
		if (result.success && !self.failure)
		{
			self.success = true;
		}
		if (result.failure)
		{
			self.success = false;
			self.failure = true;
		}
	};

	/**
	 * Return a printable representation.
	 */
	self.toString = function(indent)
	{
		indent = indent || 0;
		var message = getPrintable(self, self.key + SEPARATOR, indent) + '\n';
		message += getIndented(indent) + '{\n';
		for (var key in self.results)
		{
			var result = self.results[key];
			message += result.toString(indent + 1) + ',\n';
		}
		message += getIndented(indent) + '}';
		return message;
	};

	/**
	 * Return a shortened representation.
	 */
	self.getSummary = function()
	{
		return getPrintable(self, self.key, 0);
	};
};

/**
 * Get the printable representation for a result, like this:
 * START message END.
 * An optional indent is applied as an equivalent number of tabs.
 */
function getPrintable(result, message, indent)
{
	var start;
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
	var indented = '';
	if (indent)
	{
		for (var i = 0; i < indent; i++)
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
exports.run = function(param, callback)
{
	var series = clone(param);
	// uncaught exceptions
	process.on('uncaughtException', uncaughtException);
	var runner = new Runner('main', series);
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
};

/**
 * Process an uncaught exception.
 */
function uncaughtException(error)
{
	if (!next)
	{
		return log.error('Exception without next text');
	}
	next('Uncaught exception: ' + error.stack);
}

/**
 * A runner for a series of tests.
 */
var Runner = function(name, series)
{
	// self-reference
	var self = this;

	// attributes
	self.result = new CompositeResult(name);
	var finished = false;

	/**
	 * Run all functions in the series, one by one.
	 */
	self.runAll = function(callback)
	{
		runOne(function(error, result)
		{
			if (error)
			{
				console.error('Error in test %s: %s', name, error);
			}
			if (result)
			{
				console.log('Finished test %s: %s', name, result.getSummary());
			}
			if (finished)
			{
				return;
			}
			finished = true;
			callback(error, result);
		});
	};

	/**
	 * Run one function in the given series, go to the next.
	 */
	function runOne(callback)
	{
		if (isEmpty(series))
		{
			return callback(null, self.result);
		}
		for (var key in series)
		{
			var value = series[key];
			if (!value)
			{
				return callback('Empty test for ' + key);
			}
			else if (typeof value == 'object')
			{
				var runner = new Runner(key, value);
				return runner.runAll(function(error)
				{
					if (error)
					{
						log.error('Could not run all functions');
						return;
					}
					self.result.add(runner.result);
					deleteAndRunNext(key, callback);
				});
			}
			else if (typeof value == 'function')
			{
				var testName = key;
				if (isNumber(key) && value.name)
				{
					testName = value.name;
				}
				// it is a function to run
				next = getNext(key, testName, callback);
				return value(next);
			}
			else if (typeof value == 'string')
			{
				// it is a file name, with a test function
				var testFunction = getFileTest(value);
				if (!testFunction)
				{
					log.error('Cannot get test function from file %s', value);
					return deleteAndRunNext(key, callback);
				}
				next = getNext(key, value, callback);
				return testFunction(next);
			}
			else
			{
				log.error('Key %s has an invalid value %s', key, value);
				return deleteAndRunNext(key, callback);
			}
			// only the first element in the series is used;
			// the rest are called by recursion in deleteAndRunNext()
			return;
		}
	}

	/**
	 * Get the test function in a file.
	 */
	function getFileTest(filename)
	{
		try
		{
			var file = require(filename);
			return file.test;
		}
		catch(exception)
		{
			log.error('File %s not found: %s', filename, exception);
		}
	}

	/**
	 * Get a function to call after a test.
	 */
	function getNext(key, name, callback)
	{
		var testResult = new TestResult(name);
		return function(error, result)
		{
			testResult.callback(error, result);
			self.result.add(testResult);
			deleteAndRunNext(key, callback);
		};
	}

	/**
	 * Delete the current function, run the next.
	 */
	function deleteAndRunNext(key, callback)
	{
		if (!(key in series))
		{
			// already run
			return;
		}
		delete series[key];
		var defer = process.nextTick;
		if (typeof setImmediate != 'undefined')
		{
			// node v0.10.x
			defer = setImmediate;
		}
		return defer(function()
		{
			runOne(callback);
		});
	}
};

/**
 * Test to run some functions.
 */
function testRun()
{
	var series = {
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
	exports.run(series, function(error, result)
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
		log.info('Test run successful with 2 failures: %s', result);
	});
}

/**
 * Clone a series of functions. Performs a sanity check.
 */
function clone(series)
{
	if (typeof series != 'object')
	{
		log.error('Invalid series %s', JSON.stringify(series));
		return;
	}
	var copy = {};
	for (var key in series)
	{
		var value = series[key];
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
	var original = {
		a: function() {},
		b: {
			c: function() {},
		},
	};
	var cloned = clone(original);
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
	for (var key in object)
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

/**
 * Run all module tests.
 * Cannot use testing since it is not defined yet.
 */
function test()
{
	testEmpty();
	testClone();
	testRun();
}

// run tests if invoked directly
if (__filename == process.argv[1])
{
	test();
}

