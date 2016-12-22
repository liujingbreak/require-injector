var _ = require('lodash');
exports.FactoryMap = FactoryMap;
exports.FactoryMapCollection = FactoryMapCollection;

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
	getReplacement: function(factorySetting, type, fileParam) {
		if (!factorySetting)
			throw new Error('This is require-injector\' fault, error due to null factorySetting, tell author about it.');
		return this.replaceActions[factorySetting.method](factorySetting.value, type, fileParam, factorySetting.execResult);
	},

	getInjected: function(factorySetting, calleeModuleId, calleeModule, requireCall) {
		if (!factorySetting)
			throw new Error('This is require-injector\'s fault, error due to null factorySetting, tell author about it.');
		return this.injectActions[factorySetting.method](factorySetting.value,
			calleeModuleId, calleeModule, requireCall);
	},

	replaceActions: {
		factory: function(setting, type, fileParam, execResult) {
			if (type === 'rq') { // for require()
				return '(' + setting.toString() + ')(' + JSON.stringify(fileParam) +
				(execResult ? ',' + JSON.stringify(execResult) : '') + ')';
			}
			return null;
		},

		substitute: function(setting, type, fileParam, execResult) {
			if (type === 'rs') { // for require.ensure
				if (_.isFunction(setting))
					return JSON.stringify(setting(fileParam, execResult));
				return JSON.stringify(setting);
			} else if (type === 'rq') {
				if (_.isFunction(setting))
					return 'require(' + JSON.stringify(setting(fileParam, execResult)) + ')';
				return 'require(' + JSON.stringify(setting) + ')';
			}
		},

		value: function(setting, type, fileParam, execResult) {
			if (type !== 'rq')
				return null;
			if (_.has(setting, 'replacement')) {
				if (_.isFunction(setting.replacement))
					return setting.replacement(fileParam, execResult);
				return setting.replacement;
			} else {
				if (_.isFunction(setting))
					return JSON.stringify(setting(fileParam, execResult));
				return JSON.stringify(setting);
			}
		},

		replaceCode: function(setting, type, fileParam, execResult) {
			if (_.isFunction(setting))
				return setting(fileParam, execResult);
			return setting;
		},

		variable: function(setting, type, fileParam, execResult) {
			if (type === 'rq')
				return setting;
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
