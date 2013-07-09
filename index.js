'use strict';

/**
 * Testing library.
 * (C) 2013 Alex Fernández.
 */


// requires
var Log = require('log');
var async = require('async');
var util = require('util');

// globals
var log = new Log('info');


/**
 * Reports a success for the current test. Parameters:
 *	- message (optional): the message to show. Default: '.'.
 *	- callback (optional): function to call. If not present, just show the message.
 *	The function must be in node.js style: callback(error, result).
 *	In this case, callback(null, message).
 */
exports.success = function(message, callback)
{
	var parameters = processParameters(arguments);
	var message = parameters.message || '.';
	if (parameters.callback)
	{
		return parameters.callback(null, message);
	}
	log.notice('\u001b[32m%s\u001b[0m', message);
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
	var parameters = processParameters(arguments);
	var message = parameters.message || '.';
	if (parameters.callback)
	{
		return parameters.callback(message);
	}
	log.error('\u001b[31m%s\u001b[0m', message);
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
	callback(null);
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
	var message = util.format('%s: expected %s but got %s', parameters.message, util.inspect(expected), util.inspect(actual));
	if (parameters.callback)
	{
		return parameters.callback(message);
	}
	log.failure(message);
}

/**
 * Test assert functions.
 */
function testAssert(callback)
{
	exports.assert(1 + 1 == 2, 'Basic assert', callback);
	exports.assertEquals(1 + 1, 2, 'Basic assert', callback);
	callback();
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
	var run = false;
	async.series(tests, function(error, result)
	{
		run = true;
		if (callback)
		{
			return callback(error, result);
		}
	});
	// give it time
	setTimeout(function()
	{
		if (!run)
		{
			var message = 'Package tests did not call back';
			if (callback)
			{
				return callback(message);
			}
			log.error(message);
		}
	}, timeout);
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
		return exports.failure(error);
	}
	exports.success(util.format(result)); 
}

/**
 * Run all module tests.
 */
exports.test = function()
{
	var tests = {
		successFailure: testSuccessFailure,
		assert: testAssert,
	};
	exports.run(tests, exports.show);
}

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test();
}

