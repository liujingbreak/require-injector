/// <reference types="node" />
import { Transform } from 'stream';
import { FactoryMap, FactoryMapInterf, ReplaceType } from './factory-map';
import Injector, { InjectorOption, ResolveOption } from './node-inject';
import { ReplacementInf } from './patch-text';
import { TypescriptParser } from './parse-ts-import';
export interface RequireInjector {
    fromPackage(packageName: string | string[], resolveOpt?: ResolveOption): FactoryMapInterf;
    fromDir(dir: string | string[]): FactoryMapInterf;
    fromRoot(): FactoryMapInterf;
    transform(file: string): Transform;
    injectToFile(filePath: string, code: string, ast?: any): string;
    cleanup(): void;
}
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
    addPatch(patches: ReplacementInf[], start: number, end: number, moduleName: string, replaceType: ReplaceType, fmaps: FactoryMap[], fileParam: string): void;
}
