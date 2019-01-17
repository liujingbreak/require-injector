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
            const isPath = _.startsWith(name, '.') || Path.isAbsolute(name);
            if (!isPath && (_.startsWith(name, '@') || name.indexOf('/') > 0)) {
                var m = /^((?:@[^\/]+\/)?[^\/]+)(\/.+?)?$/.exec(name);
                if (m && _.has(this.requireMap, m[1])) {
                    setting = _.extend({}, this.requireMap[m[1]]);
                    setting.subPath = m[2];
                    setting.prefix = webpackLoaderPrefix;
                    return setting;
                }
            }
            let foundReg = _.find(this.regexSettings, s => {
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
function lookupPath(name, paths) {
    // todo
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeS1tYXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9mYWN0b3J5LW1hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxrREFBNEI7QUFDNUIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLCtEQUFtRDtBQW1CbkQsY0FBYztBQUNkLElBQVksV0FLWDtBQUxELFdBQVksV0FBVztJQUN0Qix5Q0FBSyxDQUFBO0lBQ0wsMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCx5Q0FBRSxDQUFBLENBQUMsbUJBQW1CO0FBQ3ZCLENBQUMsRUFMVyxXQUFXLEdBQVgsbUJBQVcsS0FBWCxtQkFBVyxRQUt0QjtBQXdCRCxNQUFhLFVBQVU7SUFPdEIsK0dBQStHO0lBRS9HLFlBQVksTUFBZTtRQVAzQixlQUFVLEdBQWtDLEVBQUUsQ0FBQztRQUMvQyxvQkFBZSxHQUFVLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQjtRQUM3QyxrQkFBYSxHQUFtQixFQUFFLENBQUM7UUFDbkMsb0JBQWUsR0FBWSxLQUFLLENBQUM7UUFDekIsaUJBQVksR0FBb0IsSUFBSSxDQUFDO1FBSTVDLElBQUksTUFBTSxLQUFLLFNBQVM7WUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7O1lBRWpCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxPQUFPLENBQUMsY0FBK0IsRUFBRSxXQUF3QjtRQUNoRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsVUFBVSxDQUFDLGNBQStCLEVBQUUsU0FBOEI7UUFDekUsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUNELEtBQUssQ0FBQyxjQUErQixFQUFF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