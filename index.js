/**
 * Testing library.
 * (C) 2013 Alex Fernández.
 */


import {runAll} from './lib/runner.js'
import util from 'util'

const GREEN = '\u001b[32m';
const RED = '\u001b[1;31m';
const BLACK = '\u001b[0m';
let errors = 0;


/**
 * Reports a success for the current test. Parameters:
 *	- message (optional): the message to show. Default: true.
 *	- callback (optional): function to call. If not present, just show the message.
 *	The function must be in node.js style: callback(error, result).
 *	In this case, callback(null, message).
 */
export function success(message, callback) {
	const parameters = processParameters(arguments);
	message = parameters.message || true;
	callback = parameters.callback;
	if (callback)
	{
		return callback(null, message);
	}
	if (errors)
	{
		// previous errors detected
		error('With errors: ' + message);
	}
	else
	{
		notice(message);
	}
}

/**
 * Reports a failure for the current test. Parameters:
 *	- message (optional): the message to show. Default: '.'.
 *	- callback (optional): function to call. If not present, just show the message.
 *	The function must be in node.js style: callback(error, result).
 *	In this case, callback(message).
 */
export function failure(message, callback) {
	errors += 1;
	const parameters = processParameters(arguments);
	message = parameters.message || 'Failure';
	callback = parameters.callback;
	if (callback)
	{
		return callback(message);
	}
	error(message);
}

export function fail(...args) {
	return failure(...args)
}

export function removeError() {
	errors -= 1
}

/**
 * Find a callback in any parameter, extract the message. Parameters:
 * - args: an array like, will be sanitized before util.format() is used to get the message.
 */
function processParameters(args)
{
	const parameters = {};
	if (!arguments[0])
	{
		return parameters;
	}
	const reargs = [];
	for (const i in args)
	{
		const arg = args[i];
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
 * Assert a condition, and show a failure otherwise.
 */
export function verify(condition, message, callback) {
	if (condition)
	{
		return;
	}
	delete arguments[0];
	const parameters = processParameters(arguments);
	message = parameters.message || 'Assertion error';
	callback = parameters.callback;
	// show failure with the given arguments
	failure(message, callback);
}

export function assert(...args) {
	return verify(...args)
}

/**
 * Assert that two values are equal, and show a failure otherwise.
 */
export function equals(actual, expected, message, callback) {
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
	const parameters = processParameters(arguments);
	message = parameters.message || 'Assertion for equality error';
	message = util.format('%s: expected %s but got %s', message, util.inspect(expected), util.inspect(actual));
	callback = parameters.callback;
	failure(message, callback);
}

export function assertEquals(...args) {
	return equals(...args);
}

/**
 * Assert that two values are *not* equal, and show a failure otherwise.
 */
export function notEquals(actual, unexpected, message, callback) {
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
	const parameters = processParameters(arguments);
	message = parameters.message || 'Assertion for inequality error';
	message = util.format('%s: expected %s different from %s', message, util.inspect(actual), util.inspect(unexpected));
	callback = parameters.callback;
	failure(message, callback);
}

export function assertNotEquals(...args) {
	return notEquals(...args);
}

export function contains(container, piece, message, callback) {
	if (typeof container == 'string')
	{
		if (container.indexOf(piece) != -1)
		{
			return;
		}
	}
	else if (Array.isArray(container))
	{
		for (let i = 0; i < container.length; i++)
		{
			if (container[i] == piece)
			{
				return;
			}
		}
	}
	else
	{
		message = 'Invalid container ' + typeof container + ', should be string or array, cannot check ' + message;
		return failure(message, callback);
	}
	delete arguments[0];
	delete arguments[1];
	const parameters = processParameters(arguments);
	message = parameters.message || 'Assertion for equality error';
	message = util.format('%s: %s does not contain %s', message, util.inspect(container), util.inspect(piece));
	failure(message, parameters.callback);
}

/**
 * Check that the error is falsy, show a failure otherwise.
 */
export function check(error, message, callback) {
	if (!error)
	{
		return;
	}
	delete arguments[0];
	const parameters = processParameters(arguments);
	let description = util.inspect(error);
	if (error.stack)
	{
		description = error.stack;
	}
	message = parameters.message + ': ' + description;
	callback = parameters.callback;
	// show failure with the given arguments
	failure(message, callback);
}

/**
 * Run a set of tests. Parameters:
 *	- tests: an object with an attribute for every test function,
*	an array or a single function.
 *	- timeout: an optional timeout to consider tests as failed.
 *	- callback: an optional function to call after tests have finished.
 */
export function run(tests, timeout, callback) {
	if (typeof timeout == 'function')
	{
		callback = timeout;
		timeout = 0;
	}
	if (!callback)
	{
		callback = show
	}
	if (typeof tests == 'function')
	{
		tests = [tests];
	}
	let nTests = 0;
	for (const key in tests)
	{
		if (Object.hasOwn(tests, key))
		{
			nTests += 1;
		}
	}
	// if no timeout, give each test one second
	timeout = timeout || 1000 * nTests;
	// start the timer
	const running = setTimeout(function()
	{
		const message = 'Package tests did not call back';
		error(message);
		if (callback)
		{
			return callback(message);
		}
	}, timeout);
	// run the tests
	runAll(tests, function(error, result)
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
export function show(error, result) {
	showResults(error, result);
}

/**
 * Show the complete hierarchical error results.
 */
export function showComplete(error, result) {
	console.log('Complete test results: %s', result);
	showResults(error, result);
}

/**
 * Show test results.
 */
function showResults(error, result)
{
	if (error)
	{
		failure(error);
		process.exit(1);
		return;
	}
	let printable = 'No test result';
	if (typeof result == 'string')
	{
		printable = result;
	}
	else if (result && result.getSummary)
	{
		printable = result.getSummary();
	}
	const elapsed = result.elapsedMs / 1000
	console.log(`All tests run in ${elapsed.toFixed(1)} seconds with ${printable}`);
	if (result.failure)
	{
		process.exit(1);
	}
}

/**
 * Pass a tester callback whose results you want shown.
 * Returns a function that runs the tests, shows the results and invokes the callback.
 */
export function toShow(tester) {
	return function(callback)
	{
		tester(function(error, result)
		{
			showResults(error, result);
			callback(error, result);
		});
	};
}

function error(message) {
	console.error(RED + message + BLACK);
}

function notice(message) {
	console.log(GREEN + message + BLACK);
}

const testing = {
	success, failure, fail, removeError, verify, assert,
	equals, assertEquals, notEquals, assertNotEquals,
	contains, check, run, show, showComplete, toShow,
}

export default testing

