"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypescriptParser = exports.parseTs = void 0;
const tslib_1 = require("tslib");
// tslint:disable:max-line-length
const _ts = tslib_1.__importStar(require("typescript"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const _ = tslib_1.__importStar(require("lodash"));
const parse_esnext_import_1 = require("./parse-esnext-import");
const factory_map_1 = require("./factory-map");
const patch_text_1 = tslib_1.__importDefault(require("./patch-text"));
function parseTs(file) {
    // let source = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/test-ts.txt'), 'utf8');
    let source = fs.readFileSync(Path.resolve(file), 'utf8');
    let sFile = _ts.createSourceFile('test-ts.ts', source, _ts.ScriptTarget.ES2015);
    traverse(sFile);
    function traverse(ast, level = 0) {
        // tslint:disable-next-line:no-console
        console.log(_.repeat(' |- ', level) + _ts.SyntaxKind[ast.kind]);
        if (ast.kind === _ts.SyntaxKind.ImportDeclaration) {
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
    constructor(esReplacer = null, ts = _ts) {
        this.esReplacer = esReplacer;
        this.ts = ts;
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
        this.srcfile = ast || this.ts.createSourceFile(file, source, this.ts.ScriptTarget.ESNext, true, this.ts.ScriptKind.TSX);
        const asts = [...this.srcfile.statements];
        let node = asts.shift();
        while (node != null) {
            this.traverseTsAst(node, this.srcfile, asts);
            node = asts.shift();
        }
    }
    traverseTsAst(ast, srcfile, visitLater) {
        let SyntaxKind = this.ts.SyntaxKind;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtdHMtaW1wb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcGFyc2UtdHMtaW1wb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsd0RBQWtDO0FBQ2xDLCtDQUF5QjtBQUN6QixtREFBNkI7QUFDN0Isa0RBQTRCO0FBQzVCLCtEQUFnRDtBQUNoRCwrQ0FBc0U7QUFDdEUsc0VBQXFDO0FBR3JDLFNBQWdCLE9BQU8sQ0FBQyxJQUFZO0lBQ2xDLDhGQUE4RjtJQUM5RixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekQsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxNQUFNLEVBQ25ELEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDM0IsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLFNBQVMsUUFBUSxDQUFDLEdBQWEsRUFBRSxLQUFLLEdBQUcsQ0FBQztRQUN4QyxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFO1lBQ2pELHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUMzRDtRQUNELGlCQUFpQjtRQUNqQixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBYSxFQUFFLEVBQUU7WUFDakMsUUFBUSxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekIsV0FBVztRQUNiLENBQUMsQ0FBQyxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BFLElBQUk7SUFDTixDQUFDO0FBQ0gsQ0FBQztBQXZCRCwwQkF1QkM7QUFFRCxNQUFhLGdCQUFnQjtJQU8zQixZQUFtQixhQUFvQyxJQUFJLEVBQVMsS0FBSyxHQUFHO1FBQXpELGVBQVUsR0FBVixVQUFVLENBQThCO1FBQVMsT0FBRSxHQUFGLEVBQUUsQ0FBTTtJQUFHLENBQUM7SUFFaEYsT0FBTyxDQUFDLElBQVksRUFBRSxXQUFzQyxFQUFFLFFBQWdCLEVBQUUsR0FBb0I7UUFHbEcsSUFBSSxPQUFPLEdBQTZELEVBQUUsQ0FBQztRQUMzRSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFDaEIsTUFBTSxZQUFZLEdBQUksRUFBbUIsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFpQyxLQUFhLEVBQUUsR0FBVyxFQUFFLFVBQWtCLEVBQUUsV0FBd0I7WUFDeEgsSUFBSSxDQUFFLElBQUksQ0FBQyxVQUFVO2dCQUNuQixPQUFPO1lBQ1QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakcsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFVBQVMsUUFBZ0IsRUFBRSxNQUFjLEVBQUUsS0FBYSxFQUFFLEdBQVcsRUFDM0YsVUFBa0IsRUFBRSxJQUFlO1lBQ2pDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFzQixFQUFFLEVBQUU7Z0JBQzdDLElBQUksT0FBTyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLE9BQU8sRUFBRTtvQkFDWCxJQUFJLFdBQVcsR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSx5QkFBVyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFtQixDQUFDO29CQUN4RyxJQUFJLFdBQVcsSUFBSSxJQUFJLEVBQUU7d0JBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUM7NEJBQ1gsS0FBSyxFQUFFLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSzs0QkFDaEQsR0FBRyxFQUFFLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRzs0QkFDMUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxJQUFJO3lCQUM5QixDQUFDLENBQUM7d0JBQ0gsSUFBSSxJQUFJLENBQUMsVUFBVTs0QkFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNoRTtvQkFDRCxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFDRCxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE9BQU87WUFDTCxRQUFRLEVBQUUsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQzlELE9BQU87U0FDUixDQUFDO0lBQ0osQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUFjLEVBQUUsSUFBWSxFQUFFLEdBQW9CO1FBQzlELElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQ3RGLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNoQyxNQUFNLElBQUksR0FBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0RCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDeEIsT0FBTyxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ25CLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0MsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUNyQjtJQUNILENBQUM7SUFFTyxhQUFhLENBQUMsR0FBYSxFQUFFLE9BQXVCLEVBQUUsVUFBc0I7UUFDbEYsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUM7UUFDcEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxpQkFBaUIsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRTtZQUMxRixJQUFJLElBQUksR0FBRyxHQUE0QixDQUFDO1lBQ3hDLGdFQUFnRTtZQUNoRSxJQUFJLFNBQVMsR0FBRyxJQUFJLCtCQUFTLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDdEUsT0FBTzthQUNSO1lBQ0QsU0FBUyxDQUFDLElBQUksR0FBSSxJQUFJLENBQUMsZUFBcUMsQ0FBQyxJQUFJLENBQUM7WUFFbEUsZ0tBQWdLO1lBQ2hLLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsRUFBRTtnQkFDcEMsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBYSxDQUFDLElBQUssQ0FBQyxJQUFJLENBQUM7YUFDdEQ7WUFDRCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLDRCQUE0QixDQUFDLEVBQUU7Z0JBQzdDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFhLENBQUMsYUFBYyxDQUFDO2dCQUMzQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLGVBQWUsRUFBRTtvQkFDMUMsU0FBUyxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztpQkFDdkM7cUJBQU07b0JBQ0wsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQzVCLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQzNHLENBQUMsQ0FBQyxDQUFDO2lCQUNKO2FBQ0Y7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUN6SCxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDNUQseURBQXlEO1lBQ3pELE9BQU87U0FDUjthQUFNLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsY0FBYyxFQUFFO1lBQ2pELElBQUksSUFBSSxHQUFHLEdBQXlCLENBQUM7WUFDckMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsVUFBVTtnQkFDL0MsSUFBSSxDQUFDLFVBQTZCLENBQUMsSUFBSSxLQUFLLFNBQVM7Z0JBQ3RELElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxhQUFhLEVBQUU7Z0JBQ3JELGtEQUFrRDtnQkFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUF1QixDQUFDLElBQUksRUFBRSx5QkFBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNqSSxPQUFPO2FBQ1I7aUJBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsYUFBYSxFQUFFO2dCQUM1RCxnRkFBZ0Y7Z0JBQ2hGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBdUIsQ0FBQyxJQUFJLEVBQUUseUJBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbEksT0FBTzthQUNSO2lCQUFNLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLHdCQUF3QixFQUFFO2dCQUN2RSxJQUFJLElBQUksR0FBSSxJQUFJLENBQUMsVUFBMkMsQ0FBQyxVQUFVLENBQUM7Z0JBQ3hFLElBQUksS0FBSyxHQUFJLElBQUksQ0FBQyxVQUEyQyxDQUFDLElBQUksQ0FBQztnQkFDbkUsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxVQUFVLElBQUssSUFBdUIsQ0FBQyxJQUFJLEtBQUssU0FBUztvQkFDdEYsS0FBSyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsVUFBVSxJQUFLLEtBQXdCLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtvQkFDbkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTt3QkFDN0IsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxhQUFhLEVBQUU7NEJBQ3pDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRyxHQUF5QixDQUFDLElBQUksRUFBRSx5QkFBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUNqSCw0RUFBNEU7eUJBQzdFOzZCQUFNLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsc0JBQXNCLEVBQUU7NEJBQ3pELE1BQU0sTUFBTSxHQUFHLEdBQWlDLENBQUM7NEJBQ2pELEtBQUssTUFBTSxhQUFhLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRTtnQ0FDM0MsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxhQUFhLEVBQUU7b0NBQ25ELHNDQUFzQztvQ0FDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtR0FBbUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29DQUN4SSxTQUFTO2lDQUNWO2dDQUNELElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUN4RCxhQUFhLENBQUMsTUFBTSxFQUFFLEVBQUcsYUFBbUMsQ0FBQyxJQUFJLEVBQUUseUJBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQzs2QkFDdEY7eUJBQ0Y7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsdUZBQXVGO2lCQUN4RjthQUNGO1NBQ0Y7UUFDRCxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDeEMsQ0FBQztDQUNGO0FBaElELDRDQWdJQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOm1heC1saW5lLWxlbmd0aFxuaW1wb3J0ICogYXMgX3RzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UGFyc2VJbmZvfSBmcm9tICcuL3BhcnNlLWVzbmV4dC1pbXBvcnQnO1xuaW1wb3J0IHtGYWN0b3J5TWFwLCBSZXBsYWNlVHlwZSwgUmVwbGFjZWRSZXN1bHR9IGZyb20gJy4vZmFjdG9yeS1tYXAnO1xuaW1wb3J0IHBhdGNoVGV4dCBmcm9tICcuL3BhdGNoLXRleHQnO1xuaW1wb3J0IFJlcGxhY2VSZXF1aXJlIGZyb20gJy4vcmVwbGFjZS1yZXF1aXJlJztcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVHMoZmlsZTogc3RyaW5nKSB7XG4gIC8vIGxldCBzb3VyY2UgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvdGVzdC10cy50eHQnKSwgJ3V0ZjgnKTtcbiAgbGV0IHNvdXJjZSA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoZmlsZSksICd1dGY4Jyk7XG4gIGxldCBzRmlsZSA9IF90cy5jcmVhdGVTb3VyY2VGaWxlKCd0ZXN0LXRzLnRzJywgc291cmNlLFxuICAgIF90cy5TY3JpcHRUYXJnZXQuRVMyMDE1KTtcbiAgdHJhdmVyc2Uoc0ZpbGUpO1xuICBmdW5jdGlvbiB0cmF2ZXJzZShhc3Q6IF90cy5Ob2RlLCBsZXZlbCA9IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKF8ucmVwZWF0KCcgfC0gJywgbGV2ZWwpICsgX3RzLlN5bnRheEtpbmRbYXN0LmtpbmRdKTtcbiAgICBpZiAoYXN0LmtpbmQgPT09IF90cy5TeW50YXhLaW5kLkltcG9ydERlY2xhcmF0aW9uKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ2ZvdW5kIGltcG9ydCBzdGF0ZW1lbnQnLCBhc3QuZ2V0VGV4dChzRmlsZSkpO1xuICAgIH1cbiAgICAvLyBsZXQgY291bnQgPSAwO1xuICAgIGFzdC5mb3JFYWNoQ2hpbGQoKHN1YjogX3RzLk5vZGUpID0+IHtcbiAgICAgIHRyYXZlcnNlKHN1YiwgbGV2ZWwgKyAxKTtcbiAgICAgIC8vIGNvdW50Kys7XG4gICAgfSk7XG4gICAgLy8gaWYgKGNvdW50ID09PSAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhfLnJlcGVhdCgnIHwtICcsIGxldmVsICsgMSksIGBcIiR7YXN0LmdldFRleHQoc0ZpbGUpfVwiYCk7XG4gICAgLy8gfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUeXBlc2NyaXB0UGFyc2VyIHtcbiAgc3JjZmlsZTogX3RzLlNvdXJjZUZpbGU7XG5cbiAgcHJpdmF0ZSBfYWRkUGF0Y2g6IChzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgbW9kdWxlTmFtZTogc3RyaW5nLCByZXBsYWNlVHlwZTogUmVwbGFjZVR5cGUpID0+IHZvaWQ7XG4gIHByaXZhdGUgX2FkZFBhdGNoNEltcG9ydDogKGFsbFN0YXJ0OiBudW1iZXIsIGFsbEVuZDogbnVtYmVyLCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcixcbiAgICBtb2R1bGVOYW1lOiBzdHJpbmcsIGluZm86IFBhcnNlSW5mbykgPT4gdm9pZDtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgZXNSZXBsYWNlcjogUmVwbGFjZVJlcXVpcmUgfCBudWxsID0gbnVsbCwgcHVibGljIHRzID0gX3RzKSB7fVxuXG4gIHJlcGxhY2UoY29kZTogc3RyaW5nLCBmYWN0b3J5TWFwczogRmFjdG9yeU1hcFtdIHwgRmFjdG9yeU1hcCwgZmlsZVBhdGg6IHN0cmluZywgYXN0PzogX3RzLlNvdXJjZUZpbGUpOlxuICAgIHtyZXBsYWNlZDogc3RyaW5nIHwgbnVsbCwgcGF0Y2hlczogQXJyYXk8e3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCByZXBsYWNlbWVudDogc3RyaW5nfT59IHtcblxuICAgIGxldCBwYXRjaGVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHJlcGxhY2VtZW50OiBzdHJpbmd9PiA9IFtdO1xuICAgIGxldCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBfZmFjdG9yeU1hcHMgPSAoW10gYXMgRmFjdG9yeU1hcFtdKS5jb25jYXQoZmFjdG9yeU1hcHMpO1xuICAgIHRoaXMuX2FkZFBhdGNoID0gZnVuY3Rpb24odGhpczogVHlwZXNjcmlwdFBhcnNlciwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIG1vZHVsZU5hbWU6IHN0cmluZywgcmVwbGFjZVR5cGU6IFJlcGxhY2VUeXBlKSB7XG4gICAgICBpZiAoISB0aGlzLmVzUmVwbGFjZXIpXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRoaXMuZXNSZXBsYWNlci5hZGRQYXRjaChwYXRjaGVzLCBzdGFydCwgZW5kLCBtb2R1bGVOYW1lLCByZXBsYWNlVHlwZSwgX2ZhY3RvcnlNYXBzLCBmaWxlUGF0aCk7XG4gICAgfTtcbiAgICB0aGlzLl9hZGRQYXRjaDRJbXBvcnQgPSBmdW5jdGlvbihhbGxTdGFydDogbnVtYmVyLCBhbGxFbmQ6IG51bWJlciwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsXG4gICAgICBtb2R1bGVOYW1lOiBzdHJpbmcsIGluZm86IFBhcnNlSW5mbykge1xuICAgICAgICBfZmFjdG9yeU1hcHMuc29tZSgoZmFjdG9yeU1hcDogRmFjdG9yeU1hcCkgPT4ge1xuICAgICAgICB2YXIgc2V0dGluZyA9IGZhY3RvcnlNYXAubWF0Y2hSZXF1aXJlKGluZm8uZnJvbSk7XG4gICAgICAgIGlmIChzZXR0aW5nKSB7XG4gICAgICAgICAgdmFyIHJlcGxhY2VtZW50ID0gZmFjdG9yeU1hcC5nZXRSZXBsYWNlbWVudChzZXR0aW5nLCBSZXBsYWNlVHlwZS5pbXAsIGZpbGVQYXRoLCBpbmZvKSBhcyBSZXBsYWNlZFJlc3VsdDtcbiAgICAgICAgICBpZiAocmVwbGFjZW1lbnQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcGF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICAgICAgc3RhcnQ6IHJlcGxhY2VtZW50LnJlcGxhY2VBbGwgPyBhbGxTdGFydCA6IHN0YXJ0LFxuICAgICAgICAgICAgICBlbmQ6IHJlcGxhY2VtZW50LnJlcGxhY2VBbGwgPyBhbGxFbmQgOiBlbmQsXG4gICAgICAgICAgICAgIHJlcGxhY2VtZW50OiByZXBsYWNlbWVudC5jb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChzZWxmLmVzUmVwbGFjZXIpXG4gICAgICAgICAgICAgIHNlbGYuZXNSZXBsYWNlci5lbWl0KCdyZXBsYWNlJywgaW5mby5mcm9tLCByZXBsYWNlbWVudC5jb2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMucGFyc2VUc1NvdXJjZShjb2RlLCBmaWxlUGF0aCwgYXN0KTtcbiAgICByZXR1cm4ge1xuICAgICAgcmVwbGFjZWQ6IHBhdGNoZXMubGVuZ3RoID4gMCA/IHBhdGNoVGV4dChjb2RlLCBwYXRjaGVzKSA6IG51bGwsXG4gICAgICBwYXRjaGVzXG4gICAgfTtcbiAgfVxuXG4gIHBhcnNlVHNTb3VyY2Uoc291cmNlOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgYXN0PzogX3RzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICB0aGlzLnNyY2ZpbGUgPSBhc3QgfHwgdGhpcy50cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUsIHNvdXJjZSwgdGhpcy50cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgICAgdHJ1ZSwgdGhpcy50cy5TY3JpcHRLaW5kLlRTWCk7XG4gICAgY29uc3QgYXN0czogX3RzLk5vZGVbXSA9IFsuLi50aGlzLnNyY2ZpbGUuc3RhdGVtZW50c107XG4gICAgbGV0IG5vZGUgPSBhc3RzLnNoaWZ0KCk7XG4gICAgd2hpbGUgKG5vZGUgIT0gbnVsbCkge1xuICAgICAgdGhpcy50cmF2ZXJzZVRzQXN0KG5vZGUsIHRoaXMuc3JjZmlsZSwgYXN0cyk7XG4gICAgICBub2RlID0gYXN0cy5zaGlmdCgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdHJhdmVyc2VUc0FzdChhc3Q6IF90cy5Ob2RlLCBzcmNmaWxlOiBfdHMuU291cmNlRmlsZSwgdmlzaXRMYXRlcjogX3RzLk5vZGVbXSkge1xuICAgIGxldCBTeW50YXhLaW5kID0gdGhpcy50cy5TeW50YXhLaW5kO1xuICAgIGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5JbXBvcnREZWNsYXJhdGlvbiB8fCBhc3Qua2luZCA9PT0gU3ludGF4S2luZC5FeHBvcnREZWNsYXJhdGlvbikge1xuICAgICAgbGV0IG5vZGUgPSBhc3QgYXMgX3RzLkltcG9ydERlY2xhcmF0aW9uO1xuICAgICAgLy8gY29uc29sZS5sb2coJ2ZvdW5kIGltcG9ydCBzdGF0ZW1lbnQ6JywgYXN0LmdldFRleHQoc3JjZmlsZSkpO1xuICAgICAgbGV0IHBhcnNlSW5mbyA9IG5ldyBQYXJzZUluZm8oKTtcbiAgICAgIGlmICghbm9kZS5tb2R1bGVTcGVjaWZpZXIgJiYgYXN0LmtpbmQgPT09IFN5bnRheEtpbmQuRXhwb3J0RGVjbGFyYXRpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcGFyc2VJbmZvLmZyb20gPSAobm9kZS5tb2R1bGVTcGVjaWZpZXIgYXMgX3RzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG5cbiAgICAgIC8vIHBhcnNlSW5mby5mcm9tID0gL15bICdcIl0qKFteJ1wiXSspWyAnXCJdKiQvLmV4ZWMoc3JjZmlsZS50ZXh0LnN1YnN0cmluZyhub2RlLm1vZHVsZVNwZWNpZmllci5nZXRTdGFydCh0aGlzLnNyY2ZpbGUsIGZhbHNlKSwgbm9kZS5tb2R1bGVTcGVjaWZpZXIuZ2V0RW5kKCkpKVsxXTtcbiAgICAgIGlmIChfLmdldChub2RlLCAnaW1wb3J0Q2xhdXNlLm5hbWUnKSkge1xuICAgICAgICBwYXJzZUluZm8uZGVmYXVsdFZhciA9IG5vZGUuaW1wb3J0Q2xhdXNlIS5uYW1lIS50ZXh0O1xuICAgICAgfVxuICAgICAgaWYgKF8uZ2V0KG5vZGUsICdpbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncycpKSB7XG4gICAgICAgIGxldCBuYiA9IG5vZGUuaW1wb3J0Q2xhdXNlIS5uYW1lZEJpbmRpbmdzITtcbiAgICAgICAgaWYgKG5iLmtpbmQgPT09IFN5bnRheEtpbmQuTmFtZXNwYWNlSW1wb3J0KSB7XG4gICAgICAgICAgcGFyc2VJbmZvLm5hbWVzcGFjZVZhciA9IG5iLm5hbWUudGV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuYi5lbGVtZW50cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgcGFyc2VJbmZvLnZhcnNbZWxlbWVudC5uYW1lLnRleHRdID0gZWxlbWVudC5wcm9wZXJ0eU5hbWUgPyBlbGVtZW50LnByb3BlcnR5TmFtZS50ZXh0IDogZWxlbWVudC5uYW1lLnRleHQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuX2FkZFBhdGNoNEltcG9ydChub2RlLmdldFN0YXJ0KHRoaXMuc3JjZmlsZSwgZmFsc2UpLCBub2RlLmdldEVuZCgpLCBub2RlLm1vZHVsZVNwZWNpZmllci5nZXRTdGFydCh0aGlzLnNyY2ZpbGUsIGZhbHNlKSxcbiAgICAgICAgbm9kZS5tb2R1bGVTcGVjaWZpZXIuZ2V0RW5kKCksIHBhcnNlSW5mby5mcm9tLCBwYXJzZUluZm8pO1xuICAgICAgLy8gY29uc29sZS5sb2coZ2V0VGV4dE9mKG5vZGUubW9kdWxlU3BlY2lmaWVyLCBzcmNmaWxlKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgbGV0IG5vZGUgPSBhc3QgYXMgX3RzLkNhbGxFeHByZXNzaW9uO1xuICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSBTeW50YXhLaW5kLklkZW50aWZpZXIgJiZcbiAgICAgICAgKG5vZGUuZXhwcmVzc2lvbiBhcyBfdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICAgIG5vZGUuYXJndW1lbnRzWzBdLmtpbmQgPT09IFN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnRm91bmQnLCBnZXRUZXh0T2Yobm9kZSwgc3JjZmlsZSkpO1xuICAgICAgICB0aGlzLl9hZGRQYXRjaChub2RlLmdldFN0YXJ0KHRoaXMuc3JjZmlsZSwgZmFsc2UpLCBub2RlLmdldEVuZCgpLCAobm9kZS5hcmd1bWVudHNbMF0gYXMgX3RzLlN0cmluZ0xpdGVyYWwpLnRleHQsIFJlcGxhY2VUeXBlLnJxKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5JbXBvcnRLZXl3b3JkKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdGb3VuZCBpbXBvcnQoKSAnLCBub2RlLmFyZ3VtZW50cy5tYXAoYXJnID0+IChhcmcgYXMgYW55KS50ZXh0KSk7XG4gICAgICAgIHRoaXMuX2FkZFBhdGNoKG5vZGUuZ2V0U3RhcnQodGhpcy5zcmNmaWxlLCBmYWxzZSksIG5vZGUuZ2V0RW5kKCksIChub2RlLmFyZ3VtZW50c1swXSBhcyBfdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgUmVwbGFjZVR5cGUuaW1hKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pIHtcbiAgICAgICAgbGV0IGxlZnQgPSAobm9kZS5leHByZXNzaW9uIGFzIF90cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLmV4cHJlc3Npb247XG4gICAgICAgIGxldCByaWdodCA9IChub2RlLmV4cHJlc3Npb24gYXMgX3RzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZTtcbiAgICAgICAgaWYgKGxlZnQua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmIChsZWZ0IGFzIF90cy5JZGVudGlmaWVyKS50ZXh0ID09PSAncmVxdWlyZScgJiZcbiAgICAgICAgcmlnaHQua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmIChyaWdodCBhcyBfdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ2Vuc3VyZScpIHtcbiAgICAgICAgICBub2RlLmFyZ3VtZW50cy5mb3JFYWNoKChhcmcpID0+IHtcbiAgICAgICAgICAgIGlmIChhcmcua2luZCA9PT0gU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2FkZFBhdGNoKGFyZy5nZXRTdGFydCh0aGlzLnNyY2ZpbGUsIGZhbHNlKSwgYXJnLmdldEVuZCgpLCAoYXJnIGFzIF90cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBSZXBsYWNlVHlwZS5ycyk7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGByZXBsYWNlIHJlcXVpcmUuZW5zdXJlKCR7KGFyZyBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0fSlgKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXJnLmtpbmQgPT09IFN5bnRheEtpbmQuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICBjb25zdCBhcnJBcmcgPSBhcmcgYXMgX3RzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb247XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgbW9kdWxlTmFtZUFzdCBvZiBhcnJBcmcuZWxlbWVudHMpIHtcbiAgICAgICAgICAgICAgICBpZiAobW9kdWxlTmFtZUFzdC5raW5kICE9PSBTeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3JlcXVpcmUtaW5qZWN0b3JdIHBhcnNlICVzIGZhaWxlZCwgb25seSBzdXBwb3J0IGFyZ3VtZW50cyBvZiBgcmVxdWlyZS5lbnN1cmUoKWAgYXMgU3RyaW5nTGl0ZXJhbCcsIHRoaXMuc3JjZmlsZS5maWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkUGF0Y2gobW9kdWxlTmFtZUFzdC5nZXRTdGFydCh0aGlzLnNyY2ZpbGUsIGZhbHNlKSxcbiAgICAgICAgICAgICAgICAgIG1vZHVsZU5hbWVBc3QuZ2V0RW5kKCksIChtb2R1bGVOYW1lQXN0IGFzIF90cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBSZXBsYWNlVHlwZS5ycyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnRm91bmQgcmVxdWlyZS5lbnN1cmUoKScsIG5vZGUuYXJndW1lbnRzLm1hcChhcmcgPT4gKGFyZyBhcyBhbnkpLnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB2aXNpdExhdGVyLnB1c2goLi4uYXN0LmdldENoaWxkcmVuKCkpO1xuICB9XG59XG4iXX0=