var _ = require('lodash');
var Path = require('path');
exports.FactoryMap = FactoryMap;
exports.FactoryMapCollection = FactoryMapCollection;
var toAssignment = require('./parse-es6-import').toAssignment;

function FactoryMap(config) {
	this.config = config || {};
	this.requireMap = {};
	this.beginWithSearch = []; // Binary search
	this.regexSettings = []; // {regex: RegExp, method: string, value: any, execResult: object}[],
	this.beginWithSorted = false;
}
FactoryMap.prototype = {
	METHODS: ['factory', 'substitute', 'value', 'swigTemplateDir', 'replaceCode', 'variable'], // you can extend with new method here

	matchRequire: function(name) {
		if (!name)
			return null;
		var webpackLoaderPrefix = '';
		var webpackLoaderIdx = name.lastIndexOf('!');
		if (webpackLoaderIdx >= 0) {
			webpackLoaderPrefix = name.substring(0, webpackLoaderIdx + 1);
			name = name.substring(webpackLoaderIdx + 1);
		}

		var setting;
		if (_.has(this.requireMap, name)) {
			setting = _.extend({}, this.requireMap[name]);
			setting.prefix = webpackLoaderPrefix;
			return setting;
		} else {
			var isPath = _.startsWith(name, '.') || Path.isAbsolute(name);
			if (!isPath && (_.startsWith(name, '@') || name.indexOf('/') > 0)) {
				var m = /^((?:@[^\/]+\/)?[^\/]+)(\/.+?)?$/.exec(name);
				if (m && _.has(this.requireMap, m[1])) {
					setting = _.extend({}, this.requireMap[m[1]]);
					setting.subPath = m[2];
					setting.prefix = webpackLoaderPrefix;
					return setting;
				}
			}
			var foundReg =  _.find(this.regexSettings, s => {
				s.execResult = s.regex.exec(name);
				return s.execResult != null;
			});
			if (foundReg) {
				foundReg = _.extend({}, foundReg);
				foundReg.prefix = webpackLoaderPrefix;
				return foundReg;
			}
			if (isPath && this.resolvePaths) {
				// do resolve path
				return lookupPath(name, this.resolvePaths);
			}
			return null;
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
		return this.replaceActions[factorySetting.method].call(this,
			factorySetting.value, type, fileParam, factorySetting.execResult,
			info, factorySetting.prefix, factorySetting.subPath);
	},

	getInjected: function(factorySetting, calleeModuleId, calleeModule, requireCall) {
		if (!factorySetting)
			throw new Error('This is require-injector\'s fault, error due to null factorySetting, tell author about it.');
		return this.injectActions[factorySetting.method].call(this, factorySetting.value,
			calleeModuleId, calleeModule, requireCall, factorySetting.subPath);
	},

	replaceActions: {
		factory: function(setting, type, fileParam, execResult, astInfo, prefix) {
			var sourcePath = JSON.stringify(this.config.enableFactoryParamFile ? fileParam : '');
			var execFactory = '(' + setting.toString() + ')(' + sourcePath +
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

		substitute: function(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
			if (type === 'rs') { // for require.ensure
				if (_.isFunction(setting))
					return JSON.stringify(setting(fileParam, execResult) + subPath);
				return JSON.stringify(setting + subPath);
			} else if (type === 'rq') {
				if (_.isFunction(setting))
					return 'require(' + prefix + JSON.stringify(setting(fileParam, execResult)) + subPath + ')';
				return 'require(' + prefix + JSON.stringify(setting + subPath) + ')';
			} else if (type === 'ima') {
				if (_.isFunction(setting))
					return 'import(' + prefix + JSON.stringify(setting(fileParam, execResult)) + subPath + ')';
				return 'import(' + prefix + JSON.stringify(setting) + subPath + ')';
			} else if (type === 'imp') {
				var replaced = _.isFunction(setting) ? setting(fileParam, execResult) : setting;
				replaced = JSON.stringify(prefix + replaced + subPath);
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
		},

		resolvePath: function(dir, type, fileParam, execResult, astInfo) {
			return dir;
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

		substitute: function(setting, calleeModuleId, calleeModule, requireCall, subPath) {
			return requireCall.call(calleeModule, setting + subPath);
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
				value: value,
				subPath: '',
				prefix: ''
			});
		} else {
			this.requireMap[name] = {
				method: mName,
				value: value,
				subPath: '',
				prefix: ''
			};
		}
		return this;
	};
});

FactoryMap.prototype.alias = function(name, value) {
	return this.substitute(name, value);
};

FactoryMap.prototype.addResolvePath = function(dir) {
	if (this.resolvePaths == null)
		this.resolvePaths = [];
	this.resolvePaths.push(dir);
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


function lookupPath(name, paths) {
	// todo
}
