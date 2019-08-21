"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
var Path = require('path');
const parse_esnext_import_1 = require("./parse-esnext-import");
/** // TODO */
var ReplaceType;
(function (ReplaceType) {
    ReplaceType[ReplaceType["rq"] = 0] = "rq";
    ReplaceType[ReplaceType["ima"] = 1] = "ima";
    ReplaceType[ReplaceType["imp"] = 2] = "imp";
    ReplaceType[ReplaceType["rs"] = 3] = "rs"; // require.ensure()
})(ReplaceType = exports.ReplaceType || (exports.ReplaceType = {}));
class FactoryMap {
    // static METHODS: string[] = ['factory', 'substitute', 'value', 'swigTemplateDir', 'replaceCode', 'variable'];
    constructor(config) {
        this.requireMap = {};
        this.beginWithSearch = []; // Binary search
        this.regexSettings = [];
        this.beginWithSorted = false;
        this.resolvePaths = null;
        if (config === undefined)
            this.config = {};
        else
            this.config = config;
    }
    factory(requiredModule, factoryFunc) {
        return this._addSetting('factory', requiredModule, factoryFunc);
    }
    substitute(requiredModule, newModule) {
        return this._addSetting('substitute', requiredModule, newModule);
    }
    value(requiredModule, newModule) {
        return this._addSetting('value', requiredModule, newModule);
    }
    swigTemplateDir(requiredModule, dir) {
        return this._addSetting('swigTemplateDir', requiredModule, dir);
    }
    replaceCode(requiredModule, newModule) {
        return this._addSetting('replaceCode', requiredModule, newModule);
    }
    alias(requiredModule, newModule) {
        return this._addSetting('substitute', requiredModule, newModule);
    }
    // asInterface() {
    // 	return ((this as any) as FactoryMapInterf & FactoryMap);
    // }
    getInjector(name) {
        return this.matchRequire(name);
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
        let setting;
        if (_.has(this.requireMap, name)) {
            setting = _.extend({}, this.requireMap[name]);
            setting.prefix = webpackLoaderPrefix;
            return setting;
        }
        else {
            const isPackage = !_.startsWith(name, '.') && !Path.isAbsolute(name);
            if (isPackage && (_.startsWith(name, '@') || name.indexOf('/') > 0)) {
                var m = /^((?:@[^\/]+\/)?[^\/]+)(\/.+?)?$/.exec(name);
                if (m && _.has(this.requireMap, m[1])) {
                    setting = _.extend({}, this.requireMap[m[1]]);
                    setting.subPath = m[2];
                    setting.prefix = webpackLoaderPrefix;
                    return setting;
                }
            }
            let foundReg = _.find(this.regexSettings, s => {
                s.execResult = s.regex.exec(name) || undefined;
                return s.execResult != null;
            });
            if (foundReg) {
                foundReg = _.extend({}, foundReg);
                foundReg.prefix = webpackLoaderPrefix;
                return foundReg;
            }
            return null;
        }
    }
    /**
     *
     * @param  {any} factorySetting matchRequire() returned value
     * @param  {ReplaceType} type       "rq" for "require()", "rs" for "require.ensure"
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
        return injectActions[factorySetting.method].call(this, factorySetting.value, calleeModuleId, calleeModule, requireCall, factorySetting.subPath);
    }
    addResolvePath(dir) {
        if (this.resolvePaths == null)
            this.resolvePaths = [];
        this.resolvePaths.push(dir);
        return this;
    }
    _addSetting(method, name, value) {
        if (_.isRegExp(name)) {
            this.regexSettings.push({
                regex: name,
                method,
                value,
                subPath: '',
                prefix: ''
            });
        }
        else {
            this.requireMap[name] = {
                method,
                value,
                subPath: '',
                prefix: ''
            };
        }
        return this;
    }
}
exports.FactoryMap = FactoryMap;
let replaceActions = {
    factory(value, type, fileParam, execResult, astInfo, prefix, subPath) {
        const sourcePath = JSON.stringify(this.config.enableFactoryParamFile ? fileParam : '');
        const execFactory = '(' + value.toString() + ')(' + sourcePath +
            (execResult ? ',' + JSON.stringify(execResult) : '') + ')';
        if (type === ReplaceType.rq || type === ReplaceType.ima) { // for require() or import()
            return execFactory;
        }
        else if (type === ReplaceType.imp) {
            return {
                replaceAll: true,
                code: parse_esnext_import_1.toAssignment(astInfo, execFactory)
            };
        }
        return null;
    },
    substitute(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        if (type === ReplaceType.rs) { // for require.ensure
            if (_.isFunction(setting))
                return JSON.stringify(setting(fileParam, execResult) + subPath);
            return JSON.stringify(setting + subPath);
        }
        else if (type === ReplaceType.rq) {
            if (_.isFunction(setting))
                return 'require(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
            return 'require(' + JSON.stringify(prefix + setting + subPath) + ')';
        }
        else if (type === ReplaceType.ima) {
            if (_.isFunction(setting))
                return 'import(' + JSON.stringify(prefix + setting(fileParam, execResult)) + subPath + ')';
            return 'import(' + JSON.stringify(prefix + setting) + subPath + ')';
        }
        else if (type === ReplaceType.imp) {
            var replaced = _.isFunction(setting) ? setting(fileParam, execResult) : setting;
            replaced = JSON.stringify(prefix + replaced + subPath);
            return {
                replaceAll: false,
                code: replaced
            };
        }
        return null;
    },
    value(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        if (type === ReplaceType.rq || type === ReplaceType.imp || type === ReplaceType.ima) {
            var replaced;
            if (_.has(setting, 'replacement')) {
                const setting1 = setting;
                replaced = (_.isFunction(setting1.replacement)) ?
                    setting1.replacement(fileParam, execResult) :
                    setting1.replacement;
            }
            else {
                replaced = _.isFunction(setting) ? JSON.stringify(setting(fileParam, execResult)) :
                    JSON.stringify(setting);
            }
            return type === ReplaceType.imp ? {
                replaceAll: true,
                code: parse_esnext_import_1.toAssignment(astInfo, replaced)
            } : replaced;
        }
        return null;
    },
    replaceCode(setting, type, fileParam, execResult, astInfo, prefix, subPath) {
        var replaced = setting;
        if (_.isFunction(setting))
            replaced = setting(fileParam, execResult);
        return type === ReplaceType.imp ? {
            replaceAll: true,
            code: parse_esnext_import_1.toAssignment(astInfo, replaced)
        } : replaced;
    },
    variable(setting, type, fileParam, execResult, astInfo) {
        if (type === ReplaceType.rq || type === ReplaceType.ima) {
            return setting;
        }
        if (type === ReplaceType.imp)
            return {
                replaceAll: true,
                code: parse_esnext_import_1.toAssignment(astInfo, setting)
            };
        return null;
    }
    // resolvePath(dir: FactorySetting, type: string, fileParam: string, execResult: RegExpExecArray,
    // 	astInfo: ParseInfo): string {
    // 	return dir as string;
    // }
};
let injectActions = {
    factory(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        if (_.isFunction(setting)) {
            return setting(calleeModuleId);
        }
        else {
            return setting;
        }
    },
    value(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        if (_.has(setting, 'value'))
            return setting.value;
        else
            return setting;
    },
    replaceCode(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        // tslint:disable-next-line:no-console
        console.log('require-injector does not support "replaceCode()" for NodeJS environment');
    },
    substitute(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        return requireCall.call(calleeModule, setting + subPath);
    },
    variable(setting, calleeModuleId, calleeModule, requireCall, subPath) {
        return setting;
    }
};
class FactoryMapCollection {
    constructor(maps) {
        this.maps = maps;
    }
    factory(requiredModule, factoryFunc) {
        return this._addSetting('factory', requiredModule, factoryFunc);
    }
    substitute(requiredModule, newModule) {
        return this._addSetting('substitute', requiredModule, newModule);
    }
    value(requiredModule, newModule) {
        return this._addSetting('value', requiredModule, newModule);
    }
    swigTemplateDir(requiredModule, dir) {
        return this._addSetting('swigTemplateDir', requiredModule, dir);
    }
    replaceCode(requiredModule, newModule) {
        return this._addSetting('replaceCode', requiredModule, newModule);
    }
    alias(requiredModule, newModule) {
        return this._addSetting('substitute', requiredModule, newModule);
    }
    _addSetting(method, requiredModule, newModule) {
        for (const factoryMap of this.maps) {
            factoryMap._addSetting(method, requiredModule, newModule);
        }
        return this;
    }
}
exports.FactoryMapCollection = FactoryMapCollection;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeS1tYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9mYWN0b3J5LW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxrREFBNEI7QUFDNUIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLCtEQUFtRDtBQW1CbkQsY0FBYztBQUNkLElBQVksV0FLWDtBQUxELFdBQVksV0FBVztJQUN0Qix5Q0FBSyxDQUFBO0lBQ0wsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCx5Q0FBRSxDQUFBLENBQUMsbUJBQW1CO0FBQ3ZCLENBQUMsRUFMVyxXQUFXLEdBQVgsbUJBQVcsS0FBWCxtQkFBVyxRQUt0QjtBQXlCRCxNQUFhLFVBQVU7SUFPdEIsK0dBQStHO0lBRS9HLFlBQVksTUFBZTtRQVAzQixlQUFVLEdBQWtDLEVBQUUsQ0FBQztRQUMvQyxvQkFBZSxHQUFVLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQjtRQUM3QyxrQkFBYSxHQUFtQixFQUFFLENBQUM7UUFDbkMsb0JBQWUsR0FBWSxLQUFLLENBQUM7UUFDekIsaUJBQVksR0FBb0IsSUFBSSxDQUFDO1FBSTVDLElBQUksTUFBTSxLQUFLLFNBQVM7WUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7O1lBRWpCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxPQUFPLENBQUMsY0FBK0IsRUFBRSxXQUF3QjtRQUNoRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsVUFBVSxDQUFDLGNBQStCLEVBQUUsU0FBOEI7UUFDekUsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUNELEtBQUssQ0FBQyxjQUErQixFQUFF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