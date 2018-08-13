import * as ts from 'typescript';
import { FactoryMap } from './factory-map';
export declare function parseTs(file: string): void;
export declare class TypescriptParser {
    esReplacer: any;
    srcfile: ts.SourceFile;
    constructor(esReplacer?: any);
    private _addPatch;
    private _addPatch4Import;
    replace(code: string, factoryMaps: FactoryMap[] | FactoryMap, filePath: string, ast?: ts.SourceFile): string | null;
    parseTsSource(source: string, file: string, ast?: ts.SourceFile): void;
    private traverseTsAst(ast, srcfile, level?);
}
