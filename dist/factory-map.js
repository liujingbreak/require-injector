"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactoryMapCollection = exports.FactoryMap = exports.ReplaceType = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeS1tYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9mYWN0b3J5LW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBRUEsa0RBQTRCO0FBQzVCLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQiwrREFBbUQ7QUFtQm5ELGNBQWM7QUFDZCxJQUFZLFdBS1g7QUFMRCxXQUFZLFdBQVc7SUFDdEIseUNBQUssQ0FBQTtJQUNMLDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gseUNBQUUsQ0FBQSxDQUFDLG1CQUFtQjtBQUN2QixDQUFDLEVBTFcsV0FBVyxHQUFYLG1CQUFXLEtBQVgsbUJBQVcsUUFLdEI7QUF5QkQsTUFBYSxVQUFVO0lBT3RCLCtHQUErRztJQUUvRyxZQUFZLE1BQWU7UUFQM0IsZUFBVSxHQUFrQyxFQUFFLENBQUM7UUFDL0Msb0JBQWUsR0FBVSxFQUFFLENBQUMsQ0FBQyxnQkFBZ0I7UUFDN0Msa0JBQWEsR0FBbUIsRUFBRSxDQUFDO1FBQ25DLG9CQUFlLEdBQVksS0FBSyxDQUFDO1FBQ3pCLGlCQUFZLEdBQW9CLElBQUksQ0FBQztRQUk1QyxJQUFJLE1BQU0sS0FBSyxTQUFTO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDOztZQUVqQixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN2QixDQUFDO0lBRUQsT0FBTyxDQUFDLGNBQStCLEVBQUUsV0FBd0I7UUFDaEUsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVELFVBQVUsQ0FBQyxjQUErQixFQUFFLFNBQThCO1FBQ3pFLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFDRCxLQUFLLENBQUMsY0FBK0IsRUFB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