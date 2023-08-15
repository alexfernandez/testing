/**
 * Testing library.
 * (C) 2013 Alex Fernández.
 */


import testing from './index.js'


/**
 * Test success and failure.
 */
function testSuccessFailure(callback)
{
	testing.success('success');
	testing.failure('test; please ignore');
	testing.removeError()
	testing.success('Success and failure work', callback);
}

/**
 * Test assert functions.
 */
function testAssert(callback)
{
	testing.verify(1 + 1 == 2, 'Basic assert', callback);
	testing.equals(1 + 1, 2, 'Basic assert equals', callback);
	testing.equals({a: 'a'}, {a: 'a'}, 'Object assert equals', callback);
	testing.notEquals(1 + 1, 3, 'Basic assert not equals', callback);
	testing.notEquals({a: 'a'}, {a: 'b'}, 'Object assert not equals', callback);
	testing.check(false, 'Check should not trigger', callback);
	testing.success(callback);
}

/**
 * A test which returns a complex object, to check how results are displayed.
 */
function testObject(callback)
{
	const object = {
		embedded: {
			key: 'value',
		},
	};
	testing.success(object, callback);
}

function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve()
		}, ms)
	})
}

async function testPromise()
{
	await sleep(100)
	return 'promise'
}

/**
 * Function to test separately.
 */
function testSingleFunction(callback)
{
	testing.success(true, callback);
}

/**
 * Run all module tests.
 */
function testAll(callback) {
	const tests = [
		testSuccessFailure,
		testAssert,
		{
			recursive: {
				object: testObject,
			},
		},
		testPromise,
	];
	testing.run(testSingleFunction, function(error, result)
	{
		testing.check(error, 'Could not run single function', callback);
		testing.assert(result, 'Invalid test result', callback);
		testing.run(tests, callback);
	});
}

testAll(testing.show);

