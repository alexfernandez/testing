'use strict';

/**
 * Testing library.
 * (C) 2013 Alex Fernández.
 */


// requires
var Log = require('log');
var runner = require('./lib/runner.js');
var util = require('util');

// globals
var log = new Log('info');
var errors = 0;

// constants
var IN_GREEN = '\u001b[32m%s\u001b[0m';
var IN_RED = '\u001b[1;31m%s\u001b[0m';


/**
 * Reports a success for the current test. Parameters:
 *	- message (optional): the message to show. Default: true.
 *	- callback (optional): function to call. If not present, just show the message.
 *	The function must be in node.js style: callback(error, result).
 *	In this case, callback(null, message).
 */
exports.success = function(message, callback)
{
	var parameters = processParameters(arguments);
	message = parameters.message || true;
	callback = parameters.callback;
	if (callback)
	{
		return callback(null, message);
	}
	if (errors)
	{
		// previous errors detected
		log.notice(IN_RED, 'With errors: ' + message);
	}
	else
	{
		log.notice(IN_GREEN, message);
	}
};

/**
 * Reports a failure for the current test. Parameters:
 *	- message (optional): the message to show. Default: '.'.
 *	- callback (optional): function to call. If not present, just show the message.
 *	The function must be in node.js style: callback(error, result).
 *	In this case, callback(message).
 */
exports.failure = function(message, callback)
{
	errors += 1;
	var parameters = processParameters(arguments);
	message = parameters.message || 'Failure';
	callback = parameters.callback;
	if (callback)
	{
		return callback(message);
	}
	log.error(IN_RED, message);
};

/**
 * Find a callback in any parameter, extract the message. Parameters:
 * - args: an array like, will be sanitized before util.format() is used to get the message.
 */
function processParameters(args)
{
	var parameters = {};
	if (!arguments[0])
	{
		return parameters;
	}
	var reargs = [];
	for (var i in args)
	{
		var arg = args[i];
		if (typeof arg == 'function')
		{
			parameters.callback = arg;
		}
		else
		{
			reargs.push(arg);
		}
	}
	parameters.message = util.format.apply(util, reargs);
	return parameters;
}

/**
 * Test success and failure.
 */
function testSuccessFailure(callback)
{
	exports.success('success');
	exports.failure('test; please ignore');
	// remove this error
	errors -= 1;
	exports.success('Success and failure work', callback);
}

/**
 * Assert a condition, and show a failure otherwise.
 */
exports.assert = function(condition, message, callback)
{
	if (condition)
	{
		return;
	}
	delete arguments[0];
	var parameters = processParameters(arguments);
	message = parameters.message || 'Assertion error';
	callback = parameters.callback;
	if (callback)
	{
		return callback(message);
	}
	// show failure with the given arguments
	exports.failure(message);
};

/**
 * Assert that two values are equal, and show a failure otherwise.
 */
exports.assertEquals = function(actual, expected, message, callback)
{
	if (actual == expected)
	{
		return;
	}
	if (JSON.stringify(actual) == JSON.stringify(expected))
	{
		// equal JSON => equal inputs
		return;
	}
	delete arguments[0];
	delete arguments[1];
	var parameters = processParameters(arguments);
	message = parameters.message || 'Assertion for equality error';
	message = util.format('%s: expected %s but got %s', message, util.inspect(expected), util.inspect(actual));
	callback = parameters.callback;
	if (callback)
	{
		return callback(message);
	}
	exports.failure(message);
};

/**
 * Assert that two values are *not* equal, and show a failure otherwise.
 */
exports.assertNotEquals = function(actual, unexpected, message, callback)
{
	if (actual != unexpected)
	{
		if (JSON.stringify(actual) != JSON.stringify(unexpected))
		{
			// different JSON => different inputs
			return;
		}
	}
	delete arguments[0];
	delete arguments[1];
	var parameters = processParameters(arguments);
	message = parameters.message || 'Assertion for inequality error';
	message = util.format('%s: expected %s different from %s', message, util.inspect(actual), util.inspect(unexpected));
	callback = parameters.callback;
	if (callback)
	{
		return callback(message);
	}
	exports.failure(message);
};

/**
 * Check that the error is falsy, show a failure otherwise.
 */
exports.check = function(error, message, callback)
{
	if (!error)
	{
		return;
	}
	delete arguments[0];
	var parameters = processParameters(arguments);
	var description = util.inspect(error);
	if (error.stack)
	{
		description = error.stack;
	}
	message = parameters.message + ': ' + description;
	callback = parameters.callback;
	if (callback)
	{
		return callback(message);
	}
	// show failure with the given arguments
	exports.failure(message);
};

/**
 * Test assert functions.
 */
function testAssert(callback)
{
	exports.assert(1 + 1 == 2, 'Basic assert', callback);
	exports.assertEquals(1 + 1, 2, 'Basic assert equals', callback);
	exports.assertEquals({a: 'a'}, {a: 'a'}, 'Object assert equals', callback);
	exports.assertNotEquals(1 + 1, 3, 'Basic assert not equals', callback);
	exports.assertNotEquals({a: 'a'}, {a: 'b'}, 'Object assert not equals', callback);
	exports.check(false, 'Check should not trigger', callback);
	exports.success(callback);
}

/**
 * Run a set of tests. Parameters:
 *	- tests: an object with an attribute for every test function,
*	an array or a single function.
 *	- timeout: an optional timeout to consider tests as failed.
 *	- callback: an optional function to call after tests have finished.
 */
exports.run = function(tests, timeout, callback)
{
	if (typeof timeout == 'function')
	{
		callback = timeout;
		timeout = 0;
	}
	if (!callback)
	{
		log.warning('No callback given to testing.run()');
	}
	if (typeof tests == 'function')
	{
		tests = [tests];
	}
	var nTests = 0;
	for (var key in tests)
	{
		if (tests.hasOwnProperty(key))
		{
			nTests += 1;
		}
	}
	// if no timeout, give each test one second
	timeout = timeout || 1000 * nTests;
	// start the timer
	var running = setTimeout(function()
	{
		var message = 'Package tests did not call back';
		log.error(IN_RED, message);
		if (callback)
		{
			return callback(message);
		}
	}, timeout);
	// run the tests
	runner.run(tests, function(error, result)
	{
		clearTimeout(running);
		if (callback)
		{
			return callback(error, result);
		}
	});
};

/**
 * Show the result of some tests. Parameters:
 *	- error: when tests have failed, an error message.
 *	- result: when tests have succeeded, the whole results.
 */
exports.show = function(error, result)
{
	showResults(error, result);
};

/**
 * Show the complete hierarchical error results.
 */
exports.showComplete = function(error, result)
{
	log.notice('Complete test results: %s', result);
	showResults(error, result);
};

/**
 * Show test results.
 */
function showResults(error, result)
{
	if (error)
	{
		exports.failure(error);
		process.exit(1);
		return;
	}
	var printable = 'No test result';
	if (typeof result == 'string')
	{
		printable = result;
	}
	else if (result && result.getSummary)
	{
		printable = result.getSummary();
	}
	log.notice('All tests run with %s', printable);
	if (result.failure)
	{
		process.exit(1);
	}
}

/**
 * A test which returns a complex object, to check how results are displayed.
 */
function testObject(callback)
{
	var object = {
		embedded: {
			key: 'value',
		},
	};
	exports.success(object, callback);
}

/**
 * Function to test separately.
 */
function testSingleFunction(callback)
{
	exports.success(true, callback);
}

/**
 * Pass a tester callback whose results you want shown.
 * Returns a function that runs the tests, shows the results and invokes the callback.
 */
exports.toShow = function(tester)
{
	return function(callback)
	{
		tester(function(error, result)
		{
			showResults(error, result);
			callback(error, result);
		});
	};
};

/**
 * Run all module tests.
 */
exports.test = function(callback)
{
	var tests = [
		testSuccessFailure,
		testAssert,
		{
			recursive: {
				object: testObject,
			},
		},
	];
	exports.run(testSingleFunction, function(error, result)
	{
		exports.check(error, 'Could not run single function', callback);
		exports.assert(result, 'Invalid test result', callback);
		exports.run(tests, callback);
	});
};

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test(exports.show);
}

