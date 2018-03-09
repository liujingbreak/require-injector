import { FactoryMap } from './factory-map';
export declare function parseTs(file: string): void;
export declare class TypescriptParser {
    esReplacer: any;
    constructor(esReplacer?: any);
    private _addPatch;
    private _addPatch4Import;
    replace(code: string, factoryMaps: FactoryMap[] | FactoryMap, fileParam: any): string;
    parseTsSource(source: string, file: string): void;
    private traverseTsAst(ast, srcfile, level?);
}
