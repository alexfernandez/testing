/**
 * Testing library: runner for tests.
 * (C) 2013 Alex Fernández.
 */

import {runAll, clone, isEmpty} from './runner.js'

/**
 * Test to run some functions.
 */
function testRun()
{
	const successes = {
		a: function(callback) {
			callback(null, 'a');
		},
		b: [function(callback) {
			callback(null, 'b0');
		}, function two(callback) {
			callback(null, 'b1');
		}],
	};
	runAll(successes, function(error, result) {
		console.assert(result.success, 'Root should be success');
		console.assert(result.results.a, 'Should have result for a');
		console.assert(result.results.a.success, 'Should have success for a');
		console.assert(result.results.a.message == 'a', 'Should have an a for a');
		console.assert(result.results.b, 'Should have result for b');
		console.assert(result.results.b.success, 'Should have success for b');
		console.assert(result.results.b.results[0], 'Should have result for b[0]');
		console.assert(result.results.b.results[0].success, 'Should have success for b[0]');
		console.assert(result.results.b.results[0].message == 'b0', 'Should have b0 for b[0]');
		console.assert(result.results.b.results.two, 'Should have result for two');
		console.assert(result.results.b.results.two.success, 'Should have success for two');
		console.assert(result.results.b.results.two.message == 'b1', 'Should have b1 for two');
		console.log('Test run successfully without failures: %s', result);
	});
	const failures = {
		c: {
			d: function(callback) {
				callback('d');
			},
			e: function(callback) {
				callback(null, 'e');
			},
			f: function() {
				throw new Error('exception');
			},
		},
	}
	runAll(failures, function(error) {
		console.log(error)
		console.assert(error.failure, 'Root should be failure');
		console.assert(error.results.c, 'Should have result for b');
		console.assert(error.results.c.failure, 'Should have failure for c');
		console.assert(error.results.c.results.d, 'Should have result for c.d');
		console.assert(error.results.c.results.d.message == 'd', 'Should have a d for c.d');
		console.assert(error.results.c.results.e, 'Should have result for c.e');
		console.assert(error.results.c.results.e.success, 'Should have success for c.e');
		console.assert(error.results.c.results.e.message == 'e', 'Should have an e for c.e');
		console.assert(error.results.c.results.f, 'Should have result for c.f');
		console.assert(error.results.c.results.f.failure, 'Should have failure for b.e');
		console.log('Test run successful with 2 failures: %s', error);
	})
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
 * Test the empty function.
 */
function testEmpty()
{
	console.assert(isEmpty({}), 'Empty object should be empty');
	console.assert(!isEmpty({a: 'a'}), 'Not empty object is empty');
	console.assert(isEmpty([]), 'Empty array should be empty');
	console.assert(!isEmpty(['a']), 'Not empty array is empty');
}

function testAll() {
	testRun()
	testClone()
	testEmpty()
}

testAll()

