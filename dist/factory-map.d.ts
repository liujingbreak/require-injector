import { ParseInfo } from './parse-esnext-import';
export interface Config {
    [key: string]: any;
    enableFactoryParamFile?: boolean | undefined;
}
export interface FactorySettingObj {
    method: string;
    prefix: string;
    value?: any;
    execResult?: any;
    subPath?: string;
    replacement?: (file: string, execResult: RegExpExecArray) => any | string;
}
/** // TODO */
export declare enum ReplaceType {
    rq = 0,
    ima = 1,
    imp = 2,
    rs = 3,
}
export interface RegexSetting extends FactorySettingObj {
    regex: RegExp;
}
export declare type FactorySetting = FactorySettingObj;
export interface FactoryFunc {
    (sourceFilePath: string, regexpExecResult: RegExpExecArray): string;
}
export declare class FactoryMap {
    config: Config;
    requireMap: {
        [k: string]: FactorySettingObj;
    };
    beginWithSearch: any[];
    regexSettings: RegexSetting[];
    beginWithSorted: boolean;
    private resolvePaths;
    static METHODS: string[];
    constructor(config?: Config);
    getInjector: (name: string) => FactorySetting;
    matchRequire(name: string): FactorySetting;
    /**
     *
     * @param  {any} factorySetting matchRequire() returned value
     * @param  {string} type       "rq" for "require()", "rs" for "require.ensure"
     * @param  {string} fileParam  current replacing file path
     * @return {string}            replacement text
     */
    getReplacement(factorySetting: FactorySetting, type: string, fileParam: string, info: ParseInfo): any;
    getInjected(factorySetting: FactorySetting, calleeModuleId: string, calleeModule: any, requireCall: (m: any, file: string) => FactorySetting): FactorySetting;
    addResolvePath(dir: string): this;
}
export interface FactoryMapInterf {
    factory(name: string | RegExp, RegExp: string | FactoryFunc): FactoryMapInterf;
    substitute(requiredModule: string | RegExp, newModule: string | FactoryFunc): FactoryMapInterf;
    value(requiredModule: string | RegExp, newModule: any | FactoryFunc): FactoryMapInterf;
    swigTemplateDir: (requiredModule: string, dir: string) => FactoryMapInterf;
    replaceCode: (requiredModule: string | RegExp, newModule: string | FactoryFunc) => FactoryMapInterf;
    alias: (requiredModule: string | RegExp, newModule: string | FactoryFunc) => FactoryMapInterf;
}
export declare class FactoryMapCollection {
    maps: FactoryMap[];
    constructor(maps: FactoryMap[]);
}
