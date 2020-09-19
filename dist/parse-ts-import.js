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
        const _factoryMaps = [].concat(factoryMaps);
        this._addPatch = function (start, end, moduleName, replaceType) {
            if (!this.esReplacer)
                return;
            this.esReplacer.addPatch(patches, start, end, moduleName, replaceType, _factoryMaps, filePath);
        };
        this._addPatch4Import = function (allStart, allEnd, start, end, moduleName, info) {
            _factoryMaps.some((factoryMap) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtdHMtaW1wb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcGFyc2UtdHMtaW1wb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsdURBQWlDO0FBQ2pDLCtDQUF5QjtBQUN6QixtREFBNkI7QUFDN0Isa0RBQTRCO0FBQzVCLCtEQUFnRDtBQUNoRCwrQ0FBc0U7QUFDdEUsc0VBQXFDO0FBR3JDLFNBQWdCLE9BQU8sQ0FBQyxJQUFZO0lBQ2xDLDhGQUE4RjtJQUM5RixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekQsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxNQUFNLEVBQ2xELEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLFNBQVMsUUFBUSxDQUFDLEdBQVksRUFBRSxLQUFLLEdBQUcsQ0FBQztRQUN2QyxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQy9ELElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFO1lBQ2hELHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUMzRDtRQUNELGlCQUFpQjtRQUNqQixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBWSxFQUFFLEVBQUU7WUFDaEMsUUFBUSxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekIsV0FBVztRQUNiLENBQUMsQ0FBQyxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BFLElBQUk7SUFDTixDQUFDO0FBQ0gsQ0FBQztBQXZCRCwwQkF1QkM7QUFFRCxNQUFhLGdCQUFnQjtJQU0zQixZQUFtQixhQUFvQyxJQUFJO1FBQXhDLGVBQVUsR0FBVixVQUFVLENBQThCO0lBQUcsQ0FBQztJQUUvRCxPQUFPLENBQUMsSUFBWSxFQUFFLFdBQXNDLEVBQUUsUUFBZ0IsRUFBRSxHQUFtQjtRQUdqRyxJQUFJLE9BQU8sR0FBNkQsRUFBRSxDQUFDO1FBQzNFLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUNoQixNQUFNLFlBQVksR0FBSSxFQUFtQixDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQWlDLEtBQWEsRUFBRSxHQUFXLEVBQUUsVUFBa0IsRUFBRSxXQUF3QjtZQUN4SCxJQUFJLENBQUUsSUFBSSxDQUFDLFVBQVU7Z0JBQ25CLE9BQU87WUFDVCxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqRyxDQUFDLENBQUM7UUFDRixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsVUFBUyxRQUFnQixFQUFFLE1BQWMsRUFBRSxLQUFhLEVBQUUsR0FBVyxFQUMzRixVQUFrQixFQUFFLElBQWU7WUFDakMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQXNCLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxPQUFPLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pELElBQUksT0FBTyxFQUFFO29CQUNYLElBQUksV0FBVyxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLHlCQUFXLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQW1CLENBQUM7b0JBQ3hHLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTt3QkFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQzs0QkFDWCxLQUFLLEVBQUUsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLOzRCQUNoRCxHQUFHLEVBQUUsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHOzRCQUMxQyxXQUFXLEVBQUUsV0FBVyxDQUFDLElBQUk7eUJBQzlCLENBQUMsQ0FBQzt3QkFDSCxJQUFJLElBQUksQ0FBQyxVQUFVOzRCQUNqQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ2hFO29CQUNELE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUNELE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEMsT0FBTztZQUNMLFFBQVEsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7WUFDOUQsT0FBTztTQUNSLENBQUM7SUFDSixDQUFDO0lBRUQsYUFBYSxDQUFDLE1BQWMsRUFBRSxJQUFZLEVBQUUsR0FBbUI7UUFDN0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQzVFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sSUFBSSxHQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3JELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN4QixPQUFPLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDbkIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM3QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ3JCO0lBQ0gsQ0FBQztJQUVPLGFBQWEsQ0FBQyxHQUFZLEVBQUUsT0FBc0IsRUFBRSxVQUFxQjtRQUMvRSxJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDO1FBQy9CLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsaUJBQWlCLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsaUJBQWlCLEVBQUU7WUFDMUYsSUFBSSxJQUFJLEdBQUcsR0FBMkIsQ0FBQztZQUN2QyxnRUFBZ0U7WUFDaEUsSUFBSSxTQUFTLEdBQUcsSUFBSSwrQkFBUyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ3RFLE9BQU87YUFDUjtZQUNELFNBQVMsQ0FBQyxJQUFJLEdBQUksSUFBSSxDQUFDLGVBQW9DLENBQUMsSUFBSSxDQUFDO1lBRWpFLGdLQUFnSztZQUNoSyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7Z0JBQ3BDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQWEsQ0FBQyxJQUFLLENBQUMsSUFBSSxDQUFDO2FBQ3REO1lBQ0QsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSw0QkFBNEIsQ0FBQyxFQUFFO2dCQUM3QyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsWUFBYSxDQUFDLGFBQWMsQ0FBQztnQkFDM0MsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxlQUFlLEVBQUU7b0JBQzFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7aUJBQ3ZDO3FCQUFNO29CQUNMLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUM1QixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO29CQUMzRyxDQUFDLENBQUMsQ0FBQztpQkFDSjthQUNGO1lBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFDekgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzVELHlEQUF5RDtZQUN6RCxPQUFPO1NBQ1I7YUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLGNBQWMsRUFBRTtZQUNqRCxJQUFJLElBQUksR0FBRyxHQUF3QixDQUFDO1lBQ3BDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLFVBQVU7Z0JBQy9DLElBQUksQ0FBQyxVQUE0QixDQUFDLElBQUksS0FBSyxTQUFTO2dCQUNyRCxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsYUFBYSxFQUFFO2dCQUNyRCxrREFBa0Q7Z0JBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBc0IsQ0FBQyxJQUFJLEVBQUUseUJBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDaEksT0FBTzthQUNSO2lCQUFNLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLGFBQWEsRUFBRTtnQkFDNUQsZ0ZBQWdGO2dCQUNoRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQXNCLENBQUMsSUFBSSxFQUFFLHlCQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pJLE9BQU87YUFDUjtpQkFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRTtnQkFDdkUsSUFBSSxJQUFJLEdBQUksSUFBSSxDQUFDLFVBQTBDLENBQUMsVUFBVSxDQUFDO2dCQUN2RSxJQUFJLEtBQUssR0FBSSxJQUFJLENBQUMsVUFBMEMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xFLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsVUFBVSxJQUFLLElBQXNCLENBQUMsSUFBSSxLQUFLLFNBQVM7b0JBQ3JGLEtBQUssQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLFVBQVUsSUFBSyxLQUF1QixDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7b0JBQ2xGLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7d0JBQzdCLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsYUFBYSxFQUFFOzRCQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUcsR0FBd0IsQ0FBQyxJQUFJLEVBQUUseUJBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDaEgsNEVBQTRFO3lCQUM3RTs2QkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLHNCQUFzQixFQUFFOzRCQUN6RCxNQUFNLE1BQU0sR0FBRyxHQUFnQyxDQUFDOzRCQUNoRCxLQUFLLE1BQU0sYUFBYSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUU7Z0NBQzNDLElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsYUFBYSxFQUFFO29DQUNuRCxzQ0FBc0M7b0NBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUdBQW1HLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztvQ0FDeEksU0FBUztpQ0FDVjtnQ0FDRCxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFDeEQsYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFHLGFBQWtDLENBQUMsSUFBSSxFQUFFLHlCQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7NkJBQ3JGO3lCQUNGO29CQUNILENBQUMsQ0FBQyxDQUFDO29CQUNILHVGQUF1RjtpQkFDeEY7YUFDRjtTQUNGO1FBQ0QsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7Q0FDRjtBQS9IRCw0Q0ErSEMifQ==