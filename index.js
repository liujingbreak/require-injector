var Replacer = require('./lib/replace-require');
var Injector = require('./lib/node-inject');
var _ = require('lodash');

module.exports = Replacer;
module.exports.getInstance = Injector.getInstance;
module.exports.replace = Replacer.replace;

_.forOwn(Injector.prototype, function(func, prop) {
	if (_.isFunction(func)) {
		module.exports[prop] = function() {
			if (!Injector.getInstance()) {
				if (prop === 'cleanup') {
					return;
				}
				throw new Error('Must call requireInjector(opts) first');
			}
			return func.apply(Injector.getInstance(), arguments);
		};
	}
});

_.each(['injectToFile'], function(method) {
	Replacer[method] = function() {
		return Injector.getInstance()[method].apply(Injector.getInstance(), arguments);
	};
});

Object.defineProperty(Replacer, 'transform', {
	enumerable: true,
	get: function() {
		return Injector.getInstance().transform;
	}
});
