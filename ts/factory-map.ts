import {ParseInfo} from './parse-esnext-import';
import * as _ from 'lodash';
var Path = require('path');
var {toAssignment} = require('../dist/parse-esnext-import');

export interface Config {
	[key: string]: any;
	enableFactoryParamFile?: boolean | undefined;
}
export interface FactorySettingObj {
	method: string,
	prefix: string,
	value?: any;
	execResult?: any;
	subPath?: string;
	replacement?: (file: string, execResult: RegExpExecArray) => any | string;
}

/** // TODO */
export enum ReplaceType {
	rq= 0, ima, imp, rs
}

export interface RegexSetting extends FactorySettingObj{
	regex: RegExp;
}

export type FactorySetting = FactorySettingObj;

interface ReplaceActions {
	[method: string]: (setting: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string) => any;
}

interface InjectActions {
	[method: string]: (setting: FactorySetting,
		calleeModuleId: string,
		calleeModule?: any,
		requireCall?: (m: any, file: string) => FactorySetting,
		subPath?: string) => FactorySetting
}

export interface FactoryFunc{
	(sourceFilePath: string, regexpExecResult: RegExpExecArray): string
}

export class FactoryMap {
	config: Config;
	requireMap: {[k: string]: FactorySettingObj} = {};
	beginWithSearch: any[] = []; // Binary search
	regexSettings: RegexSetting[] = [];
	beginWithSorted: boolean = false;
	private resolvePaths: string[] | null = null;
	static METHODS: string[] = ['factory', 'substitute', 'value', 'swigTemplateDir', 'replaceCode', 'variable'];

	constructor(config?: Config) {
		if (config == undefined)
			this.config = {};
		else
			this.config = config;
	}

	asInterface() {
		return ((this as any) as FactoryMapInterf & FactoryMap);
	}

	getInjector: (name: string) => FactorySetting;
	// you can extend with new method here

	matchRequire(name: string): FactorySetting {
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
	}

	/**
	 *
	 * @param  {any} factorySetting matchRequire() returned value
	 * @param  {string} type       "rq" for "require()", "rs" for "require.ensure"
	 * @param  {string} fileParam  current replacing file path
	 * @return {string}            replacement text
	 */
	getReplacement(factorySetting: FactorySetting, type: string, fileParam: string, info: ParseInfo) {
		if (!factorySetting)
			throw new Error('This is require-injector\' fault, error due to null factorySetting, tell author about it.');
		return replaceActions[factorySetting.method].call(this,
			factorySetting.value, type, fileParam, factorySetting.execResult,
			info, factorySetting.prefix, factorySetting.subPath);
	}

	getInjected(factorySetting: FactorySetting, calleeModuleId: string, calleeModule: any,
		requireCall: (m: any, file: string) => FactorySetting): FactorySetting {
		if (!factorySetting)
			throw new Error('This is require-injector\'s fault, error due to null factorySetting, tell author about it.');
		return injectActions[factorySetting.method](factorySetting.value,
			calleeModuleId, calleeModule, requireCall, factorySetting.subPath);
	}

	addResolvePath(dir: string) {
		if (this.resolvePaths == null)
			this.resolvePaths = [];
		this.resolvePaths.push(dir);
		return this;
	}
}

let replaceActions: ReplaceActions = {
	factory(this: FactoryMap, setting: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string) {
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

	substitute(this: FactoryMap, setting: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string) {
		if (type === 'rs') { // for require.ensure
			if (_.isFunction(setting))
				return JSON.stringify(setting(fileParam, execResult) + subPath);
			return JSON.stringify(setting + subPath);
		} else if (type === 'rq') {
			if (_.isFunction(setting))
				return 'require(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
			return 'require(' + JSON.stringify(prefix + setting + subPath) + ')';
		} else if (type === 'ima') {
			if (_.isFunction(setting))
				return 'import(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
			return 'import(' + JSON.stringify(prefix + setting) + subPath + ')';
		} else if (type === 'imp') {
			var replaced = _.isFunction(setting) ? setting(fileParam, execResult) : setting;
			replaced = JSON.stringify(prefix + replaced + subPath);
			return {
				replaceAll: false,
				code: replaced
			};
		}
	},

	value(this: FactoryMap, setting: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string) {
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

	replaceCode(setting: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo, prefix?: any, subPath?: string) {
		var replaced = setting;
		if (_.isFunction(setting))
			replaced = setting(fileParam, execResult);
		return type === 'imp' ? {
			replaceAll: true,
			code: toAssignment(astInfo, replaced)
		} : replaced;
	},

	variable(setting: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
		astInfo: ParseInfo) {
		if (type === 'rq' || type === 'ima')
			return setting;
		if (type === 'imp')
			return {
				replaceAll: true,
				code: toAssignment(astInfo, setting)
			};
		return null;
	}

	// resolvePath(dir: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
	// 	astInfo: ParseInfo): string {
	// 	return dir as string;
	// }
}

export interface FactoryMapInterf {
	factory(name: string | RegExp, RegExp : string| FactoryFunc): FactoryMapInterf;
	substitute(requiredModule: string | RegExp, newModule: string| FactoryFunc): FactoryMapInterf;
	value(requiredModule: string | RegExp, newModule: any| FactoryFunc): FactoryMapInterf;
	swigTemplateDir: (requiredModule: string, dir: string) => FactoryMapInterf;
	replaceCode: (requiredModule: string | RegExp, newModule: string| FactoryFunc) => FactoryMapInterf;
	alias: (requiredModule: string | RegExp, newModule: string| FactoryFunc) => FactoryMapInterf;
}

let injectActions: InjectActions = {
	factory: function(setting: FactorySetting,
		calleeModuleId: string,
		calleeModule?: any,
		requireCall?: (m: any, file: string) => FactorySetting,
		subPath?: string) {
		if (_.isFunction(setting)) {
			return setting(calleeModuleId);
		} else {
			return setting;
		}
	},

	value: function(setting: FactorySetting,
		calleeModuleId: string,
		calleeModule?: any,
		requireCall?: (m: any, file: string) => FactorySetting,
		subPath?: string) {
		if (_.has(setting, 'value'))
			return setting.value;
		else
			return setting;
	},

	replaceCode: function(setting: FactorySetting,
		calleeModuleId: string,
		calleeModule?: any,
		requireCall?: (m: any, file: string) => FactorySetting,
		subPath?: string): any {
		console.log('require-injector does not support "replaceCode()" for NodeJS environment');
	},

	substitute: function(setting: FactorySetting, calleeModuleId: string, calleeModule?: any,
		requireCall?: (m: any, file: string) => FactorySetting, subPath?: string) {
		return requireCall.call(calleeModule, setting + subPath);
	},

	variable: function(setting: FactorySetting,
		calleeModuleId: string,
		calleeModule?: any,
		requireCall?: (m: any, file: string) => FactorySetting,
		subPath?: string) {
		return setting;
	}
}

FactoryMap.prototype.getInjector = FactoryMap.prototype.matchRequire;

FactoryMap.METHODS.forEach(function(mName) {
	/**
	 * @param name {string | RegExp}
	 */
	let prot: any = FactoryMap.prototype;
	prot[mName] = function(this: FactoryMap, name: string | RegExp, value: any) {
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

(FactoryMap.prototype as any).alias = (FactoryMap.prototype as any).substitute;

export class FactoryMapCollection {
	maps: FactoryMap[];
	constructor(maps: FactoryMap[]) {
		this.maps = maps;
	}
	// [method: string]: () => FactoryMapCollection;
}

FactoryMap.METHODS.forEach(function(method) {
	(FactoryMapCollection.prototype as any)[method] = function(this: FactoryMapCollection) {
		this.maps.forEach((factoryMap: any) => {
			factoryMap[method].apply(factoryMap, arguments);
		});
		return this;
	};
});

(FactoryMapCollection.prototype as any).alias = (FactoryMapCollection.prototype as any).substitute;



function lookupPath(name: string, paths: string[]): null {
	// todo
	return null;
}
