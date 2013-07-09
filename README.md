# testing

Simple testing library for node.js.

## Installation

Just run:
    $ npm install testing

Or add package testing to your package.json dependencies.

## Usage

Add asynchronous testing to your code very easily. Require testing:

    var testing = require('testing');

Add a test function to your code:

    function testThis(callback)
    {
        if (1 + 1 == 2)
        {
            testing.success(callback);
        }
        else
        {
            testing.failure('Maths fail', callback);
        }
    }

Run all tests:

    testing.run({
        this: testThis,
    });

Will run tests sequentially.

## API

Integration is very easy.

### Basics

Callbacks are used for asynchronous testing. They follow the usual node.js convention:

    callback(error, result);

When no callback is passed, synchronous testing is performed.

#### testing.success([callback])

Note success for the current test.

#### testing.failure([message], [callback])

Note failure for the current test.

If the callback is present, calls the callback with the error:

    callback(message);

Otherwise the message is shown using console.error().

Default message: 'Error'.

#### testing.run(tests, [timeout], [callback])

Run a set of tests. The first parameter is an object containing one attribute for every testing function. Example:

    testing.run({
        first: testFirst,
        second: testSecond,
    });

For each attribute, the key is used to display success; the value is a testing function that accepts an optional callback.

The tests are considered as a failure when a certain configurable timeout has passed.
The timeout parameter is in milliseconds. The default is 1 second per test.

When the optional callback is given, it is called after a failure or the success of all tests.

Note: testing uses async to run tests in series.

### Asserts

There are several utility methods for assertions.

#### testing.assert(condition, [message], [callback])

Checks condition; if true, does nothing. Otherwise calls the callback passing the message, if present.

When there is no callback, just prints the message to console.log() for success, console.error() for errors.

Default message: 'Assertion error'.

#### testing.assertEquals(expected, actual, [message], [callback])

Check that the given values are equal. Uses weak equality (==).

Message and callback behave just like above.

### Showing results

You can use your own function to show results. The library provides a premade callback:

#### testing.show(error, result)

Show an error if present, a success if there was no error.

## License

(The MIT License)

Copyright (c) 2013 Alex Fernández <alexfernandeznpm@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

