'use strict';

/**
 * Testing library: runner for tests.
 * (C) 2013 Alex Fernández.
 */


// requires
var Log = require('log');
var util = require('util');

// globals
var log = new Log('info');
var errors = 0;

// constants
var GREEN = '\u001b[32m';
var RED = '\u001b[1;31m';
var BLACK = '\u001b[0m';
var SUCCESS_START = GREEN + '✓ ';
var SUCCESS_END = BLACK;
var FAILURE_START = RED + '✕ ';
var FAILURE_END = BLACK;
var SEPARATOR = ': ';


/**
 * A test result.
 */
var TestResult = function(key)
{
	// self-reference
	var self = this;

	// attributes
	self.success = false;
	self.failure = false;
	self.message = null;
	
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
				self.success = false;
				self.failure = true;
				self.message = error;
			}
		}
		else
		{
			if (!self.failure)
			{
				if (self.success)
				{
					// only one success allowed
					self.failure = true;
					self.success = false;
					self.message = 'Duplicated call to callback';
				}
				else
				{
					self.success = true;
					self.message = result;
				}
			}
		}
	}

	/**
	 * Return a printable representation.
	 */
	self.toString = function()
	{
		if (!failure && !success)
		{
			return '? ' + key;
		}
		if (success && failure)
		{
			return '??? ' + key + SEPARATOR + message;
		}
		if (success)
		{
			return SUCCESS_START + key + SEPARATOR + message + SUCCESS.END;
		}
		return FAILURE_START + key + SEPARATOR + message + FAILURE_END;
	}
}

/**
 * Run a series of functions sequentially. Parameters:
 *	- param: an indexed object with functions, or with nested indexed objects.
 *	- callback: a function(error, result) to pass an indexed object with the results.
 */
exports.run = function(param, callback)
{
	var series = clone(param);
	runAll(series, callback);
}

/**
 * Run all functions sequentially, call the callback at the end.
 */
function runAll(series, callback)
{
	var results = {};
	runOne(series, results, callback);
}

/**
 * Run one function in the series, go to the next.
 */
function runOne(series, results, callback)
{
	if (isEmpty(series))
	{
		return callback(null, results);
	}
	for (var key in series)
	{
		var value = series[key];
		if (typeof value == 'object')
		{
			runAll(value, function(error, result)
			{
				if (error)
				{
					log.error('Could not run all functions');
					return;
				}
				results[key] = result;
				deleteAndRunNext(key, series, results, callback);
			});
		}
		else if (typeof value == 'function')
		{
			results[key] = new TestResult(key);
			// it is a function to run
			value(function(error, result)
			{
				results[key].callback(error, result);
				deleteAndRunNext(key, series, results, callback);
			});
		}
		else
		{
			log.error('Invalid value %s', value);
			deleteAndRunNext(key, series, results, callback);
		}
	}
}

/**
 * Delete the current function, run the next.
 */
function deleteAndRunNext(key, series, results, callback)
{
	if (!(key in series))
	{
		// already run
		return;
	}
	delete series[key];
	return process.nextTick(function()
	{
		runOne(series, results, callback);
	});
}

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
		},
	};
	exports.run(series, function(error, result)
	{
		console.assert(result.a, 'Should have result for a');
		console.assert(result.a.success, 'Should have success for a');
		console.assert(result.a.message == 'a', 'Should have an a for a');
		console.assert(result.b, 'Should have result for b');
		console.assert(result.b.c, 'Should have result for b.c');
		console.assert(result.b.c.success, 'Should have success for b.c');
		console.assert(result.b.c.message == 'c', 'Should have a c for b.c');
		console.assert(result.b.e, 'Should have result for b.e');
		console.assert(result.b.e.failure, 'Should have failure for b.e');
		console.assert(result.b.e.message == 'e', 'Should have a e for b.e');
		log.info('Test run successful');
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
		if (typeof value == 'function')
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
		a: function(parameter) {},
		b: {
			c: function(parameter) {},
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
	console.assert(isEmpty({}), 'Empty should be empty');
	console.assert(!isEmpty({a: 'a'}), 'Not empty is empty');
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

