import * as ts from 'typescript';
import { FactoryMap } from './factory-map';
import ReplaceRequire from './replace-require';
export declare function parseTs(file: string): void;
export declare class TypescriptParser {
    esReplacer: ReplaceRequire;
    srcfile: ts.SourceFile;
    private _addPatch;
    private _addPatch4Import;
    constructor(esReplacer?: ReplaceRequire);
    replace(code: string, factoryMaps: FactoryMap[] | FactoryMap, filePath: string, ast?: ts.SourceFile): string | null;
    parseTsSource(source: string, file: string, ast?: ts.SourceFile): void;
    private traverseTsAst;
}
