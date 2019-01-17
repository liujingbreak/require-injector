"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
        return patches.length > 0 ? patch_text_1.default(code, patches) : null;
    }
    parseTsSource(source, file, ast) {
        this.srcfile = ast || ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, false, ts.ScriptKind.TSX);
        for (let stm of this.srcfile.statements) {
            this.traverseTsAst(stm, this.srcfile);
        }
    }
    traverseTsAst(ast, srcfile, level = 0) {
        let SyntaxKind = ts.SyntaxKind;
        if (ast.kind === SyntaxKind.ImportDeclaration) {
            let node = ast;
            // console.log('found import statement:', ast.getText(srcfile));
            let parseInfo = new parse_esnext_import_1.ParseInfo();
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
        ast.forEachChild((sub) => {
            this.traverseTsAst(sub, srcfile, level + 1);
        });
    }
}
exports.TypescriptParser = TypescriptParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtdHMtaW1wb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcGFyc2UtdHMtaW1wb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGlDQUFpQztBQUNqQyx1REFBaUM7QUFDakMsK0NBQXlCO0FBQ3pCLG1EQUE2QjtBQUM3QixrREFBNEI7QUFDNUIsK0RBQWdEO0FBQ2hELCtDQUFzRTtBQUN0RSxzRUFBcUM7QUFHckMsU0FBZ0IsT0FBTyxDQUFDLElBQVk7SUFDbkMsOEZBQThGO0lBQzlGLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN6RCxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFDbkQsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN6QixRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEIsU0FBUyxRQUFRLENBQUMsR0FBWSxFQUFFLEtBQUssR0FBRyxDQUFDO1FBQ3hDLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDL0QsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUU7WUFDakQsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQzFEO1FBQ0QsaUJBQWlCO1FBQ2pCLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFZLEVBQUUsRUFBRTtZQUNqQyxRQUFRLENBQUMs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