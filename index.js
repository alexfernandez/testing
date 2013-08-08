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
	var message = parameters.message || true;
	if (parameters.callback)
	{
		return parameters.callback(null, message);
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
}

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
	var message = parameters.message || 'Failure';
	if (parameters.callback)
	{
		return parameters.callback(message);
	}
	log.error(IN_RED, message);
}

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
	exports.failure('test; do not consider');
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
	var message = parameters.message || 'Assertion error';
	if (parameters.callback)
	{
	   return parameters.callback(parameters.message);	
	}
	// show failure with the given arguments
	exports.failure(parameters.message);
}

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
	var message = parameters.message || 'Assertion error';
	var message = util.format('%s: expected %s but got %s', message, util.inspect(expected), util.inspect(actual));
	if (parameters.callback)
	{
		return parameters.callback(message);
	}
	exports.failure(message);
}

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
	var message = parameters.message + ': ' + error;
	if (parameters.callback)
	{
	   return parameters.callback(message);
	}
	// show failure with the given arguments
	exports.failure(message);
}

/**
 * Test assert functions.
 */
function testAssert(callback)
{
	exports.assert(1 + 1 == 2, 'Basic assert', callback);
	exports.assertEquals(1 + 1, 2, 'Basic assert equals', callback);
	exports.check(false, 'Check should not trigger', callback);
	exports.success(callback);
}

/**
 * Run a set of tests. Parameters:
 *	- tests: an object with an attribute for every test function.
 *	- timeout: an optional timeout to consider tests as failed.
 *	- callback: an optional function to call after tests have finished.
 */
exports.run = function(tests, timeout, callback)
{
	if (typeof timeout == 'function')
	{
		callback = timeout;
		timeout = 0;
		for (var key in tests)
		{
			timeout += 1000;
		}
	}
	// start the timer
	var running = setTimeout(function()
	{
		var message = 'Package tests did not call back';
		if (callback)
		{
			return callback(message);
		}
		log.error(message);
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
}

/**
 * Show the result of some tests. Parameters:
 *	- error: when tests have failed, an error message.
 *	- result: when tests have succeeded, the whole results.
 */
exports.show = function(error, result)
{
	if (error)
	{
		exports.failure(error);
		process.exit(1);
		return;
	}
	exports.success('All tests run: %s', result);
	if (result.failure)
	{
		process.exit(1);
	}
}

/**
 * Run all module tests.
 */
exports.test = function(callback)
{
	var tests = {
		successFailure: testSuccessFailure,
		assert: testAssert,
	};
	exports.run(tests, callback);
}

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test(exports.show);
}

