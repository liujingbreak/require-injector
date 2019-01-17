/// <reference types="node" />
import { Transform } from 'stream';
import { ReplacementInf } from './patch-text';
import { FactoryMap, ReplaceType, FactoryMapInterf } from './factory-map';
import Injector, { InjectorOption, ResolveOption } from './node-inject';
import * as acorn from 'acorn';
import { TypescriptParser } from './parse-ts-import';
export interface RequireInjector {
    fromPackage(packageName: string | string[], resolveOpt?: ResolveOption): FactoryMapInterf;
    fromDir(dir: string | string[]): FactoryMapInterf;
    transform(file: string): Transform;
    injectToFile(filePath: string, code: string, ast?: any): string;
    cleanup(): void;
}
export declare function replace(code: string, factoryMaps: FactoryMap[], fileParam: any, ast: any): string;
export default class ReplaceRequire extends Injector implements RequireInjector {
    transform: (file: string) => Transform;
    protected tsParser: TypescriptParser;
    /**
     * opts.enableFactoryParamFile `true` if you need "filePath" as parameter for .factory(factory(filePath) {...})
     * 	this will expose original source file path in code, default is `false`.
     */
    constructor(opts?: InjectorOption);
    cleanup(): void;
    /**
     * Here "inject" is actually "replacement".
     Parsing a matched file to Acorn AST tree, looking for matched `require(module)` expression and replacing
      them with proper values, expression.
     * @name injectToFile
     * @param  {string} filePath file path
     * @param  {string} code     content of file
     * @param  {object} ast      optional, if you have already parsed code to AST tree, pass it to this function which
     *  helps to speed up process by skip parsing again.
     * @return {string}          replaced source code, if there is no injectable `require()`,
     * 	same source code will be returned.
     */
    injectToFile(filePath: string, code: string, ast?: any): string;
    /**
     * @return null if there is no change
     */
    replace(code: string, fm: FactoryMap | FactoryMap[], fileParam: string, ast?: any): string;
    protected onImport(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]): void;
    protected onExport(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]): void;
    protected onImportAsync(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]): void;
    protected onRequire(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]): void;
    protected onRequireEnsure(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]): void;
    protected addPatch(patches: ReplacementInf[], start: number, end: number, moduleName: string, replaceType: ReplaceType, fmaps: FactoryMap[], fileParam: string): void;
}
export declare function parseCode(code: string): acorn.Node;
