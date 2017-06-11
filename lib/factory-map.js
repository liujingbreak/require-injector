var _ = require('lodash');
exports.FactoryMap = FactoryMap;
exports.FactoryMapCollection = FactoryMapCollection;
var toAssignment = require('./parse-es6-import').toAssignment;

function FactoryMap() {
	this.requireMap = {};
	this.regexSettings = []; // {regex: RegExp, method: string, value: any, execResult: object}[]
}
FactoryMap.prototype = {
	METHODS: ['factory', 'substitute', 'value', 'swigTemplateDir', 'replaceCode', 'variable'], // you can extend with new method here

	matchRequire: function(name) {
		if (_.has(this.requireMap, name)) {
			return this.requireMap[name];
		} else {
			return _.find(this.regexSettings, s => {
				s.execResult = s.regex.exec(name);
				return s.execResult != null;
			});
		}
	},

	/**
	 *
	 * @param  {any} factorySetting matchRequire() returned value
	 * @param  {string} type       "rq" for "require()", "rs" for "require.ensure"
	 * @param  {string} fileParam  current replacing file path
	 * @return {string}            replacement text
	 */
	getReplacement: function(factorySetting, type, fileParam, info) {
		if (!factorySetting)
			throw new Error('This is require-injector\' fault, error due to null factorySetting, tell author about it.');
		return this.replaceActions[factorySetting.method](
			factorySetting.value, type, fileParam, factorySetting.execResult, info);
	},

	getInjected: function(factorySetting, calleeModuleId, calleeModule, requireCall) {
		if (!factorySetting)
			throw new Error('This is require-injector\'s fault, error due to null factorySetting, tell author about it.');
		return this.injectActions[factorySetting.method](factorySetting.value,
			calleeModuleId, calleeModule, requireCall);
	},

	replaceActions: {
		factory: function(setting, type, fileParam, execResult, astInfo) {
			var execFactory = '(' + setting.toString() + ')(' + JSON.stringify(fileParam) +
					(execResult ? ',' + JSON.stringify(execResult) : '') + ')';

			if (type === 'rq' || type === 'ima') { // for require() or import()
				return execFactory;
			} else if (type === 'imp') {
				return {
					replaceAll: true,
					code: toAssignment(astInfo, execFactory)
				};
			}
			return null;
		},

		substitute: function(setting, type, fileParam, execResult, astInfo) {
			if (type === 'rs') { // for require.ensure
				if (_.isFunction(setting))
					return JSON.stringify(setting(fileParam, execResult));
				return JSON.stringify(setting);
			} else if (type === 'rq') {
				if (_.isFunction(setting))
					return 'require(' + JSON.stringify(setting(fileParam, execResult)) + ')';
				return 'require(' + JSON.stringify(setting) + ')';
			} else if (type === 'ima') {
				if (_.isFunction(setting))
					return 'import(' + JSON.stringify(setting(fileParam, execResult)) + ')';
				return 'import(' + JSON.stringify(setting) + ')';
			} else if (type === 'imp') {
				var replaced = _.isFunction(setting) ? setting(fileParam, execResult) : setting;
				replaced = JSON.stringify(replaced);
				return {
					replaceAll: false,
					code: replaced
				};
			}
		},

		value: function(setting, type, fileParam, execResult, astInfo) {
			if (type === 'rq' || type === 'imp' || type === 'ima') {
				var replaced;
				if (_.has(setting, 'replacement')) {
					replaced = (_.isFunction(setting.replacement)) ?
						setting.replacement(fileParam, execResult) :
						setting.replacement;
				} else {
					replaced = _.isFunction(setting) ? JSON.stringify(setting(fileParam, execResult)) :
						JSON.stringify(setting);
				}
				return type === 'imp' ? {
						replaceAll: true,
						code: toAssignment(astInfo, replaced)
					} : replaced;
			}
			return null;
		},

		replaceCode: function(setting, type, fileParam, execResult, astInfo) {
			var replaced = setting;
			if (_.isFunction(setting))
				replaced = setting(fileParam, execResult);
			return type === 'imp' ? {
				replaceAll: true,
				code: toAssignment(astInfo, replaced)
			} : replaced;
		},

		variable: function(setting, type, fileParam, execResult, astInfo) {
			if (type === 'rq' || type === 'ima')
				return setting;
			if (type === 'imp')
				return {
					replaceAll: true,
					code: toAssignment(astInfo, setting)
				};
			return null;
		}
	},

	injectActions: {
		factory: function(setting, calleeModuleId) {
			if (_.isFunction(setting)) {
				return setting(calleeModuleId);
			} else {
				return setting;
			}
		},

		value: function(setting, calleeModuleId, calleeModule, requireCall) {
			if (_.has(setting, 'value'))
				return setting.value;
			else
				return setting;
		},

		replaceCode: function(setting, calleeModuleId, calleeModule, requireCall) {
			console.log('require-injector does not support "replaceCode()" for NodeJS environment');
		},

		substitute: function(setting, calleeModuleId, calleeModule, requireCall) {
			return requireCall.call(calleeModule, setting);
		},

		variable: function(setting, calleeModuleId, calleeModule, requireCall) {
			return setting;
		}
	}
};

FactoryMap.prototype.getInjector = FactoryMap.prototype.matchRequire;

FactoryMap.prototype.METHODS.forEach(function(mName) {
	/**
	 * @param name {string | RegExp}
	 */
	FactoryMap.prototype[mName] = function(name, value) {
		if (_.isRegExp(name)) {
			this.regexSettings.push( {
				regex: name,
				method: mName,
				value: value
			});
		} else {
			this.requireMap[name] = {
				method: mName,
				value: value
			};
		}
		return this;
	};
});

FactoryMap.prototype.alias = function(name, value) {
	if (!_.isRegExp(name))
		name = new RegExp('^' + name + '(/.*)?$');
	this.regexSettings.push({
		regex: name,
		method: 'substitute',
		value: function(path, matches) {
			var val = value;
			if (_.isFunction(value))
				val = value(path);
			if (matches[1])
				return val + matches[1];
			else
				return val;
		}
	});
	return this;
};

function FactoryMapCollection(factoryMaps) {
	this.maps = factoryMaps;
}

FactoryMap.prototype.METHODS.forEach(function(method) {
	FactoryMapCollection.prototype[method] = function() {
		this.maps.forEach(factoryMap => {
			factoryMap[method].apply(factoryMap, arguments);
		});
		return this;
	};
});
