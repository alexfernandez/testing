

const GREEN = '\u001b[32m';
const RED = '\u001b[1;31m';
const PURPLE = '\u001b[1;35m';
const BLACK = '\u001b[0m';
const SUCCESS_START = GREEN + '✓ ';
const END = BLACK;
const FAILURE_START = RED + '✕ ';
const UNKNOWN_START = PURPLE + '? ';
const INVALID_START = PURPLE + '??? ';
const SEPARATOR = ': ';


/**
 * A test result.
 */
export class TestResult {
	constructor(key) {
		this.key = key;
		this.success = false;
		this.failure = false;
		this.message = null;
		this.finished = false;
	}
	
	/**
	 * Callback for the test result.
	 * Can only be called once.
	 */
	callback(error, result) {
		if (error)
		{
			// only report the first failure
			if (!this.failure)
			{
				this.fail(error);
			}
		}
		else if (!this.failure)
		{
			if (result && result.failure)
			{
				return this.fail(result);
			}
			return this.succeed(result);
		}
	}

	/**
	 * Report a failure.
	 */
	fail(message)
	{
		this.failure = true;
		this.success = false;
		this.message = message;
		console.log(FAILURE_START + this.key + SEPARATOR + message + END);
		this.finished = true;
	}

	/**
	 * Report a success.
	 */
	succeed(message)
	{
		if (this.finished)
		{
			if (this.success)
			{
				message = 'Duplicated call to callback';
			}
			// only one success allowed
			return this.fail(message);
		}
		this.success = true;
		this.message = message;
		console.log(SUCCESS_START + this.key + SEPARATOR + message + END);
		this.finished = true;
	}

	/**
	 * Return a printable representation.
	 */
	toString(indent) {
		let message = this.key;
		if (this.message)
		{
			message += SEPARATOR + this.message;
		}
		return getPrintable(this, message, indent);
	}
}

/**
 * A result that contains other results.
 */
export class CompositeResult {
	constructor(key) {
		this.key = key;
		this.success = false;
		this.failure = false;
		this.failures = 0;
		this.results = {};
		this.startMs = 0
	}

	start() {
		this.startMs = Date.now()
	}

	/**
	 * Add a sub-result.
	 */
	add(result) {
		this.results[result.key] = result;
		if (result.success && !this.failure)
		{
			this.success = true;
		}
		if (result.failure)
		{
			this.success = false;
			this.failure = true;
		}
	}

	finish() {
		if (!this.start) {
			throw new Error('Missing start time')
		}
		this.elapsedMs = Date.now() - this.startMs
	}

	/**
	 * Return a printable representation.
	 */
	toString(indent) {
		indent = indent || 0;
		let message = getPrintable(this, this.key + SEPARATOR, indent) + '\n';
		message += getIndented(indent) + '{\n';
		for (const key in this.results)
		{
			const result = this.results[key];
			message += result.toString(indent + 1) + ',\n';
		}
		message += getIndented(indent) + '}';
		return message;
	}

	/**
	 * Return a shortened representation.
	 */
	getSummary() {
		return getPrintable(this, this.key, 0);
	}
}

/**
 * Get the printable representation for a result, like this:
 * START message END.
 * An optional indent is applied as an equivalent number of tabs.
 */
function getPrintable(result, message, indent)
{
	let start;
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
	let indented = '';
	if (indent)
	{
		for (let i = 0; i < indent; i++)
		{
			indented += '\t';
		}
	}
	return indented;
}

