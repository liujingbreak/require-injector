"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
var Path = require('path');
var { toAssignment } = require('../dist/parse-esnext-import');
// interface FactoryMapInterf {
// 	factory: (name: string | RegExp, RegExp : string| FactoryFunc) => FactoryMapInterf;
// 	substitute: (requiredModule: string | RegExp, newModule: string| FactoryFunc) => FactoryMapInterf;
// 	value: (requiredModule: string | RegExp, newModule: any| FactoryFunc) => FactoryMapInterf;
// 	swigTemplateDir: (requiredModule: string, dir: string) => FactoryMapInterf;
// 	replaceCode: (requiredModule: string | RegExp, newModule: string| FactoryFunc) => FactoryMapInterf;
// 	alias: (requiredModule: string | RegExp, newModule: string| FactoryFunc) => FactoryMapInterf;
// }
class FactoryMapObj {
    constructor(config) {
        this.requireMap = {};
        this.beginWithSearch = []; // Binary search
        this.regexSettings = [];
        this.beginWithSorted = false;
        this.resolvePaths = null;
        if (config == undefined)
            this.config = {};
        else
            this.config = config;
    }
    // you can extend with new method here
    matchRequire(name) {
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
        }
        else {
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
            var foundReg = _.find(this.regexSettings, s => {
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
    getReplacement(factorySetting, type, fileParam, info) {
        if (!factorySetting)
            throw new Error('This is require-injector\' fault, error due to null factorySetting, tell author about it.');
        return replaceActions[factorySetting.method].call(this, factorySetting.value, type, fileParam, factorySetting.execResult, info, factorySetting.prefix, factorySetting.subPath);
    }
    getInjected(factorySetting, calleeModuleId, calleeModule, requireCall) {
        if (!factorySetting)
            throw new Error('This is require-injector\'s fault, error due to null factorySetting, tell author about it.');
        return injectActions[factorySetting.method](factorySetting.value, calleeModuleId, calleeModule, requireCall, factorySetting.subPath);
    }
    addResolvePath(dir) {
        if (this.resolvePaths == null)
            this.resolvePaths = [];
        this.resolvePaths.push(dir);
        return this;
    }
}
FactoryMapObj.METHODS = ['factory', 'substitute', 'value', 'swigTemplateDir', 'replaceCode', 'variable'];
exports.FactoryMapObj = FactoryMapObj;
exports.FactoryMap = FactoryMapObj;
let replaceActions = {
    factory(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        var sourcePath = JSON.stringify(this.config.enableFactoryParamFile ? fileParam : '');
        var execFactory = '(' + setting.toString() + ')(' + sourcePath +
            (execResult ? ',' + JSON.stringify(execResult) : '') + ')';
        if (type === 'rq' || type === 'ima') {
            return execFactory;
        }
        else if (type === 'imp') {
            return {
                replaceAll: true,
                code: toAssignment(astInfo, execFactory)
            };
        }
        return null;
    },
    substitute(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        if (type === 'rs') {
            if (_.isFunction(setting))
                return JSON.stringify(setting(fileParam, execResult) + subPath);
            return JSON.stringify(setting + subPath);
        }
        else if (type === 'rq') {
            if (_.isFunction(setting))
                return 'require(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
            return 'require(' + JSON.stringify(prefix + setting + subPath) + ')';
        }
        else if (type === 'ima') {
            if (_.isFunction(setting))
                return 'import(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
            return 'import(' + JSON.stringify(prefix + setting) + subPath + ')';
        }
        else if (type === 'imp') {
            var replaced = _.isFunction(setting) ? setting(fileParam, execResult) : setting;
            replaced = JSON.stringify(prefix + replaced + subPath);
            return {
                replaceAll: false,
                code: replaced
            };
        }
    },
    value(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        if (type === 'rq' || type === 'imp' || type === 'ima') {
            var replaced;
            if (_.has(setting, 'replacement')) {
                replaced = (_.isFunction(setting.replacement)) ?
                    setting.replacement(fileParam, execResult) :
                    setting.replacement;
            }
            else {
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
    replaceCode(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        var replaced = setting;
        if (_.isFunction(setting))
            replaced = setting(fileParam, execResult);
        return type === 'imp' ? {
            replaceAll: true,
            code: toAssignment(astInfo, replaced)
        } : replaced;
    },
    variable(setting, type, fileParam, execResult, astInfo) {
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
};
let injectActions = {
    factory: function (setting, calleeModuleId, calleeModule, requireCall, subPath) {
        if (_.isFunction(setting)) {
            return setting(calleeModuleId);
        }
        else {
            return setting;
        }
    },
    value: function (setting, calleeModuleId, calleeModule, requireCall, subPath) {
        if (_.has(setting, 'value'))
            return setting.value;
        else
            return setting;
    },
    replaceCode: function (setting, calleeModuleId, calleeModule, requireCall, subPath) {
        console.log('require-injector does not support "replaceCode()" for NodeJS environment');
    },
    substitute: function (setting, calleeModuleId, calleeModule, requireCall, subPath) {
        return requireCall.call(calleeModule, setting + subPath);
    },
    variable: function (setting, calleeModuleId, calleeModule, requireCall, subPath) {
        return setting;
    }
};
FactoryMapObj.prototype.getInjector = FactoryMapObj.prototype.matchRequire;
FactoryMapObj.METHODS.forEach(function (mName) {
    /**
     * @param name {string | RegExp}
     */
    let prot = FactoryMapObj.prototype;
    prot[mName] = function (name, value) {
        if (_.isRegExp(name)) {
            this.regexSettings.push({
                regex: name,
                method: mName,
                value: value,
                subPath: '',
                prefix: ''
            });
        }
        else {
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
FactoryMapObj.prototype.alias = FactoryMapObj.prototype.substitute;
class FactoryMapCollection {
    constructor(maps) {
        this.maps = maps;
    }
}
exports.FactoryMapCollection = FactoryMapCollection;
FactoryMapObj.METHODS.forEach(function (method) {
    FactoryMapCollection.prototype[method] = function () {
        this.maps.forEach((factoryMap) => {
            factoryMap[method].apply(factoryMap, arguments);
        });
        return this;
    };
});
FactoryMapCollection.prototype.alias = FactoryMapCollection.prototype.substitute;
function lookupPath(name, paths) {
    // todo
    return null;
}
//# sourceMappingURL=factory-map.js.map