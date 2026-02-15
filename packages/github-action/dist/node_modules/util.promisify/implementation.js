'use strict';

var forEach = require('for-each');

var $Object = require('es-object-atoms');

var isES5 = typeof $Object.defineProperty === 'function';

var gPO = $Object.getPrototypeOf;
var sPO = $Object.setPrototypeOf;
// eslint-disable-next-line global-require
var hasProto = require('has-proto')() || (typeof gPO === 'function' && gPO([]) === Array.prototype);

if (!isES5 || !hasProto) {
	throw new TypeError('util.promisify requires a true ES5+ environment, that also supports `__proto__` and/or `Object.getPrototypeOf`');
}

var getOwnPropertyDescriptors = require('object.getownpropertydescriptors');

if (typeof Promise !== 'function') {
	throw new TypeError('`Promise` must be globally available for util.promisify to work.');
}

var GetIntrinsic = require('get-intrinsic');

var oDP = $Object.defineProperty;
var $Promise = GetIntrinsic('%Promise%');
var $TypeError = TypeError;

var safeConcat = require('safe-array-concat');
var callBind = require('call-bind');
var callBound = require('call-bound');
var defineDataProperty = require('define-data-property');

var $slice = callBound('Array.prototype.slice');

var hasSymbols = require('has-symbols/shams')();

// eslint-disable-next-line no-restricted-properties
var kCustomPromisifiedSymbol = hasSymbols ? Symbol['for']('nodejs.util.promisify.custom') : null;
var kCustomPromisifyArgsSymbol = hasSymbols ? Symbol('customPromisifyArgs') : null;

module.exports = function promisify(orig) {
	if (typeof orig !== 'function') {
		var error = new $TypeError('The "original" argument must be of type function');
		error.code = 'ERR_INVALID_ARG_TYPE';
		error.toString = function value() {
			return this.name + '[' + this.code + ']: ' + this.message;
		};
		throw error;
	}

	if (hasSymbols && orig[kCustomPromisifiedSymbol]) {
		var customFunction = orig[kCustomPromisifiedSymbol];
		if (typeof customFunction !== 'function') {
			var customError = $TypeError('The [util.promisify.custom] property must be of type function.');
			customError.code = 'ERR_INVALID_ARG_TYPE';
			customError.toString = function value() {
				return this.name + '[' + this.code + ']: ' + this.message;
			};
			throw customError;
		}
		defineDataProperty(
			customFunction,
			kCustomPromisifiedSymbol,
			customFunction,
			true,
			true,
			null,
			true
		);
		return customFunction;
	}

	// Names to create an object from in case the callback receives multiple
	// arguments, e.g. ['stdout', 'stderr'] for child_process.exec.
	var argumentNames = orig[kCustomPromisifyArgsSymbol];

	var origApply = callBind.apply(orig);

	var promisified = function fn() {
		var args = $slice(arguments);
		var self = this; // eslint-disable-line no-invalid-this
		return new $Promise(function (resolve, reject) {
			origApply(self, safeConcat(args, function (err) {
				var values = arguments.length > 1 ? $slice(arguments, 1) : [];
				if (err) {
					reject(err);
				} else if (typeof argumentNames !== 'undefined' && values.length > 1) {
					var obj = {};
					forEach(argumentNames, function (name, index) {
						obj[name] = values[index];
					});
					resolve(obj);
				} else {
					resolve(values[0]);
				}
			}));
		});
	};

	if (typeof sPO === 'function' && typeof gPO === 'function') {
		sPO(promisified, gPO(orig));
	} else {
		promisified.__proto__ = orig.__proto__; // eslint-disable-line no-proto
	}

	defineDataProperty(promisified, kCustomPromisifiedSymbol, promisified, true, true, null, true);

	var descriptors = getOwnPropertyDescriptors(orig);
	forEach(descriptors, function (k, v) {
		try {
			oDP(promisified, k, v);
		} catch (e) {
			// handle nonconfigurable function properties
		}
	});
	return promisified;
};

module.exports.custom = kCustomPromisifiedSymbol;
module.exports.customPromisifyArgs = kCustomPromisifyArgsSymbol;
