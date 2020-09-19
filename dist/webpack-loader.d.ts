import * as wp from 'webpack';
import Injector from './replace-require';
import ts from 'typescript';
export interface LoaderOptions {
    injector: Injector;
    /** cache should return compiled AST:sourceFile */
    astCache?(resource: string): ts.SourceFile | undefined | null;
    /** If you don't provide astCache, a new AST is created and can be returned by this call back */
    onAstCreated?(resource: string, ast: ts.SourceFile): void;
}
declare const loader: wp.loader.Loader;
export { loader as default };
