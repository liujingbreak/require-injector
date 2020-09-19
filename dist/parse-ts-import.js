"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypescriptParser = exports.parseTs = void 0;
const tslib_1 = require("tslib");
// tslint:disable:max-line-length
const ts = tslib_1.__importStar(require("typescript"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const _ = tslib_1.__importStar(require("lodash"));
const parse_esnext_import_1 = require("./parse-esnext-import");
const factory_map_1 = require("./factory-map");
const patch_text_1 = tslib_1.__importDefault(require("./patch-text"));
function parseTs(file) {
    // let source = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/test-ts.txt'), 'utf8');
    let source = fs.readFileSync(Path.resolve(file), 'utf8');
    let sFile = ts.createSourceFile('test-ts.ts', source, ts.ScriptTarget.ES2015);
    traverse(sFile);
    function traverse(ast, level = 0) {
        // tslint:disable-next-line:no-console
        console.log(_.repeat(' |- ', level) + ts.SyntaxKind[ast.kind]);
        if (ast.kind === ts.SyntaxKind.ImportDeclaration) {
            // tslint:disable-next-line:no-console
            console.log('found import statement', ast.getText(sFile));
        }
        // let count = 0;
        ast.forEachChild((sub) => {
            traverse(sub, level + 1);
            // count++;
        });
        // if (count === 0) {
        // tslint:disable-next-line:no-console
        console.log(_.repeat(' |- ', level + 1), `"${ast.getText(sFile)}"`);
        // }
    }
}
exports.parseTs = parseTs;
class TypescriptParser {
    constructor(esReplacer = null) {
        this.esReplacer = esReplacer;
    }
    replace(code, factoryMaps, filePath, ast) {
        let patches = [];
        let self = this;
        factoryMaps = [].concat(factoryMaps);
        this._addPatch = function (start, end, moduleName, replaceType) {
            if (!this.esReplacer)
                return;
            this.esReplacer.addPatch(patches, start, end, moduleName, replaceType, factoryMaps, filePath);
        };
        this._addPatch4Import = function (allStart, allEnd, start, end, moduleName, info) {
            _.some(factoryMaps, (factoryMap) => {
                var setting = factoryMap.matchRequire(info.from);
                if (setting) {
                    var replacement = factoryMap.getReplacement(setting, factory_map_1.ReplaceType.imp, filePath, info);
                    if (replacement != null) {
                        patches.push({
                            start: replacement.replaceAll ? allStart : start,
                            end: replacement.replaceAll ? allEnd : end,
                            replacement: replacement.code
                        });
                        if (self.esReplacer)
                            self.esReplacer.emit('replace', info.from, replacement.code);
                    }
                    return true;
                }
                return false;
            });
        };
        this.parseTsSource(code, filePath, ast);
        return {
            replaced: patches.length > 0 ? patch_text_1.default(code, patches) : null,
            patches
        };
    }
    parseTsSource(source, file, ast) {
        this.srcfile = ast || ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
        const asts = [...this.srcfile.statements];
        let node = asts.shift();
        while (node != null) {
            this.traverseTsAst(node, this.srcfile, asts);
            node = asts.shift();
        }
    }
    traverseTsAst(ast, srcfile, visitLater) {
        let SyntaxKind = ts.SyntaxKind;
        if (ast.kind === SyntaxKind.ImportDeclaration || ast.kind === SyntaxKind.ExportDeclaration) {
            let node = ast;
            // console.log('found import statement:', ast.getText(srcfile));
            let parseInfo = new parse_esnext_import_1.ParseInfo();
            if (!node.moduleSpecifier && ast.kind === SyntaxKind.ExportDeclaration) {
                return;
            }
            parseInfo.from = node.moduleSpecifier.text;
            // parseInfo.from = /^[ '"]*([^'"]+)[ '"]*$/.exec(srcfile.text.substring(node.moduleSpecifier.getStart(this.srcfile, false), node.moduleSpecifier.getEnd()))[1];
            if (_.get(node, 'importClause.name')) {
                parseInfo.defaultVar = node.importClause.name.text;
            }
            if (_.get(node, 'importClause.namedBindings')) {
                let nb = node.importClause.namedBindings;
                if (nb.kind === SyntaxKind.NamespaceImport) {
                    parseInfo.namespaceVar = nb.name.text;
                }
                else {
                    nb.elements.forEach(element => {
                        parseInfo.vars[element.name.text] = element.propertyName ? element.propertyName.text : element.name.text;
                    });
                }
            }
            this._addPatch4Import(node.getStart(this.srcfile, false), node.getEnd(), node.moduleSpecifier.getStart(this.srcfile, false), node.moduleSpecifier.getEnd(), parseInfo.from, parseInfo);
            // console.log(getTextOf(node.moduleSpecifier, srcfile));
            return;
        }
        else if (ast.kind === SyntaxKind.CallExpression) {
            let node = ast;
            if (node.expression.kind === SyntaxKind.Identifier &&
                node.expression.text === 'require' &&
                node.arguments[0].kind === SyntaxKind.StringLiteral) {
                // console.log('Found', getTextOf(node, srcfile));
                this._addPatch(node.getStart(this.srcfile, false), node.getEnd(), node.arguments[0].text, factory_map_1.ReplaceType.rq);
                return;
            }
            else if (node.expression.kind === SyntaxKind.ImportKeyword) {
                // console.log('Found import() ', node.arguments.map(arg => (arg as any).text));
                this._addPatch(node.getStart(this.srcfile, false), node.getEnd(), node.arguments[0].text, factory_map_1.ReplaceType.ima);
                return;
            }
            else if (node.expression.kind === SyntaxKind.PropertyAccessExpression) {
                let left = node.expression.expression;
                let right = node.expression.name;
                if (left.kind === SyntaxKind.Identifier && left.text === 'require' &&
                    right.kind === SyntaxKind.Identifier && right.text === 'ensure') {
                    node.arguments.forEach((arg) => {
                        if (arg.kind === SyntaxKind.StringLiteral) {
                            this._addPatch(arg.getStart(this.srcfile, false), arg.getEnd(), arg.text, factory_map_1.ReplaceType.rs);
                            // console.log(`replace require.ensure(${(arg as ts.StringLiteral).text})`);
                        }
                        else if (arg.kind === SyntaxKind.ArrayLiteralExpression) {
                            const arrArg = arg;
                            for (const moduleNameAst of arrArg.elements) {
                                if (moduleNameAst.kind !== SyntaxKind.StringLiteral) {
                                    // tslint:disable-next-line:no-console
                                    console.log('[require-injector] parse %s failed, only support arguments of `require.ensure()` as StringLiteral', this.srcfile.fileName);
                                    continue;
                                }
                                this._addPatch(moduleNameAst.getStart(this.srcfile, false), moduleNameAst.getEnd(), moduleNameAst.text, factory_map_1.ReplaceType.rs);
                            }
                        }
                    });
                    // console.log('Found require.ensure()', node.arguments.map(arg => (arg as any).text));
                }
            }
        }
        visitLater.push(...ast.getChildren());
    }
}
exports.TypescriptParser = TypescriptParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtdHMtaW1wb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcGFyc2UtdHMtaW1wb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsdURBQWlDO0FBQ2pDLCtDQUF5QjtBQUN6QixtREFBNkI7QUFDN0Isa0RBQTRCO0FBQzVCLCtEQUFnRDtBQUNoRCwrQ0FBc0U7QUFDdEUsc0VBQXFDO0FBR3JDLFNBQWdCLE9BQU8sQ0FBQyxJQUFZO0lBQ2xDLDhGQUE4RjtJQUM5RixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekQsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxNQUFNLEVBQ2xELEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLFNBQVMsUUFBUSxDQUFDLEdBQVksRUFBRSxLQUFLLEdBQUcsQ0FBQztRQUN2QyxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQy9ELElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFO1lBQ2hELHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUMzRDtRQUNELGlCQUFpQjtRQUNqQixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBWSxFQUFFLEVBQUU7WUFDaEMsUUFBUSxDQUFD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