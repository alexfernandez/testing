[![Build Status](https://secure.travis-ci.org/alexfernandez/testing.png)](http://travis-ci.org/alexfernandez/testing)

Simple async testing library for node.js.
Better suited to asynchronous tests than other libraries since it uses callbacks to get results.

Now shows results in pretty colors!

## Installation

Just run:
    $ npm install testing

Or add package testing to your package.json dependencies.

## Usage

Add asynchronous testing to your code very easily. Require testing:

    var testing = require('testing');

### Unit tests

Add a test function to your code, checking if results are what should be expected:

    function testAdd(callback)
    {
		testing.assertEquals(add(1, 1), 2, 'Maths fail', callback);
		testing.success(callback);
    }

Run an async test to read the contents of a file and check it is not empty:

    function testAsync(callback)
    {
        function fs.readFile('file.txt', function(error, result)
        {
            if (error)
            {
                testing.failure('File not read', callback);
            }
            testing.assert(result, 'Empty file', callback);
            testing.success(callback);
        });
    }

### Running all tests

Run all tests:

    testing.run([
        testAdd,
        testAsync,
    ], callback);

Will run tests sequentially. Usually test are run inside an exported function `test`:

    /**
     * Run package tests.
     */
    exports.test = function(callback)
    {   
        var tests = [
            testAdd,
            testAsync,
        ];
        testing.run(tests, callback);
    };  
        
    // run tests if invoked directly
    if (__filename == process.argv[1])
    {   
        exports.test(testing.show);
    }

All tests are run every time the file is invoked directly:

    node my-file.js

The function `test` is exported so that tests from all source code files
can be required and run in sequence from a master file,
usually called `test.js` and placed in the root of the project.

### Running all tests in a project

If you want to run all tests in a project, you can pass a filename as a test:

    var tests = [
        __dirname__ + '/lib/first.js',
        __dirname__ + '/lib/second.js',
    ];
    testing.run(tests, callback);

Each file should have its own exported test function.
This is a common practice in a global test file `test.js`.

## API

Implementation is very easy, based around three functions.

### Basics

Callbacks are used for asynchronous testing. They follow the usual node.js convention:

    callback(error, result);

When no callback is passed, synchronous testing is performed.

#### testing.success([message], [callback])

Note success for the current test. An optional message is shown if there is no callback.

If there is a callback, then it is called with the message. Default message: true.

Example:

    testing.success(callback);

#### testing.failure([message], [callback])

Note failure for the current test.

If the callback is present, calls the callback with the error:

    callback(message);

Otherwise the message is shown using console.error(). Default message: 'Error'.

Example:

    testing.failure('An error happened', callback);

#### testing.run(tests, [timeout], [callback])

Run a set of tests. The first parameter is an object containing one attribute for every testing function.

The tests are considered as a failure when a certain configurable timeout has passed.
The timeout parameter is in milliseconds. The default is 2 seconds per test.

When the optional callback is given, it is called after a failure or the success of all tests.

Example:

    testing.run({
        first: testFirst,
        second: testSecond,
    }, 1000, callback);

For each attribute, the key is used to display success; the value is a testing function that accepts an optional callback.

Note: testing uses async to run tests in series.

### Asserts

There are several utility methods for assertions.

#### testing.assert(condition, [message], [callback])

Checks condition; if true, does nothing. Otherwise calls the callback passing the message, if present.

When there is no callback, just prints the message to console.log() for success, console.error() for errors.
Default message: 'Assertion error'.

Example:

    testing.assert(shouldBeTrue(), 'shouldBeTrue() should return a truthy value', callback);

#### testing.assertEquals(actual, expected, [message], [callback])

Check that the given values are equal. Uses weak equality (==).

Message and callback behave just like above.

Example:

    testing.assertEquals(getOnePlusOne(), 2, 'getOnePlusOne() does not work', callback);

#### testing.assertNotEquals(actual, unexpected, [message], [callback])

Inverse of the above, check that the given values are *not* equal. Uses weak inequality (!=).

#### testing.check(error, [message], [callback])

Check there are no errors.
Almost the exact opposite of an assertion: if there is an error, count as a failure.
Otherwise, do nothing.

Example:

    testing.check(error, 'There should be no errors', callback);

Similar to over the following code:

    testing.assert(!error, 'There should be no errors', callback);

But with the advantage that it shows the actual error message should there be one.

### Showing results

You can use your own function to show results. The library provides a premade callback:

#### testing.show(error, result)

Show an error if present, a success if there was no error.

Example:

    testing.run(tests, testing.show);

This line can be run at the end of every code file to run its set of tests.

#### testing.showComplete(error, result)

Like `testing.show()`, but shows the complete hierarchical tree of tests.
Test information is therefore duplicated: once shown while running,
another after all tests.

Example:

    exports.test(testing.showComplete);

#### testing.toShow(tester)

Returns a function with a callback as parameter,
that runs the tests, shows results and invokes the callback.
Useful to insert in some callback loop.

Example:

    var tasks = [testing.toShow(test1), testing.toShow(test2)];
    async.parallel(tasks, function()
    {
        console.log('All tests run');
    });

Runs a couple of tests in parallel, showing their results as they finish.

### Sample code

This library is tested using itself, check it out!
  https://github.com/alexfernandez/testing/blob/master/index.js

## License

(The MIT License)

Copyright (c) 2013 Alex Fernández <alexfernandeznpm@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

