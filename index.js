var Replacer = require('./replace-require');
var Injector = require('./node-inject');
var _ = require('lodash');

module.exports = Replacer;
module.exports.replace = Replacer.replace;

_.forOwn(Injector.prototype, function(func, prop) {
	if (_.isFunction(func)) {
		module.exports[prop] = function() {
			if (!Replacer.getInstance()) {
				if (prop === 'cleanup') {
					return;
				}
				throw new Error('Must call requireInjector(opts) first');
			}
			return func.apply(Replacer.getInstance(), arguments);
		};
	}
});

_.each(['injectToFile'], function(method) {
	Replacer[method] = function() {
		return Replacer.getInstance()[method].apply(Replacer.getInstance(), arguments);
	};
});

Object.defineProperty(Replacer, 'transform', {
	enumerable: true,
	get: function() {
		return Replacer.getInstance().transform;
	}
});
