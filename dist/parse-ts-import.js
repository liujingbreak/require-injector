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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtdHMtaW1wb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcGFyc2UtdHMtaW1wb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxpQ0FBaUM7QUFDakMsdURBQWlDO0FBQ2pDLCtDQUF5QjtBQUN6QixtREFBNkI7QUFDN0Isa0RBQTRCO0FBQzVCLCtEQUFnRDtBQUNoRCwrQ0FBc0U7QUFDdEUsc0VBQXFDO0FBR3JDLFNBQWdCLE9BQU8sQ0FBQyxJQUFZO0lBQ2xDLDhGQUE4RjtJQUM5RixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekQsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxNQUFNLEVBQ2xELEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLFNBQVMsUUFBUSxDQUFDLEdBQVksRUFBRSxLQUFLLEdBQUcsQ0FBQztRQUN2QyxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQy9ELElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFO1lBQ2hELHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUMzRDtRQUNELGlCQUFpQjtRQUNqQixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBWSxFQUFFLEVBQUU7WUFDaEMsUUFBUSxDQUFD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QUFHLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7Q0FDRjtBQS9IRCw0Q0ErSEMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTptYXgtbGluZS1sZW5ndGhcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UGFyc2VJbmZvfSBmcm9tICcuL3BhcnNlLWVzbmV4dC1pbXBvcnQnO1xuaW1wb3J0IHtGYWN0b3J5TWFwLCBSZXBsYWNlVHlwZSwgUmVwbGFjZWRSZXN1bHR9IGZyb20gJy4vZmFjdG9yeS1tYXAnO1xuaW1wb3J0IHBhdGNoVGV4dCBmcm9tICcuL3BhdGNoLXRleHQnO1xuaW1wb3J0IFJlcGxhY2VSZXF1aXJlIGZyb20gJy4vcmVwbGFjZS1yZXF1aXJlJztcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVHMoZmlsZTogc3RyaW5nKSB7XG4gIC8vIGxldCBzb3VyY2UgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzL3NwZWMvdGVzdC10cy50eHQnKSwgJ3V0ZjgnKTtcbiAgbGV0IHNvdXJjZSA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoZmlsZSksICd1dGY4Jyk7XG4gIGxldCBzRmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoJ3Rlc3QtdHMudHMnLCBzb3VyY2UsXG4gICAgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSk7XG4gIHRyYXZlcnNlKHNGaWxlKTtcbiAgZnVuY3Rpb24gdHJhdmVyc2UoYXN0OiB0cy5Ob2RlLCBsZXZlbCA9IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKF8ucmVwZWF0KCcgfC0gJywgbGV2ZWwpICsgdHMuU3ludGF4S2luZFthc3Qua2luZF0pO1xuICAgIGlmIChhc3Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5JbXBvcnREZWNsYXJhdGlvbikge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdmb3VuZCBpbXBvcnQgc3RhdGVtZW50JywgYXN0LmdldFRleHQoc0ZpbGUpKTtcbiAgICB9XG4gICAgLy8gbGV0IGNvdW50ID0gMDtcbiAgICBhc3QuZm9yRWFjaENoaWxkKChzdWI6IHRzLk5vZGUpID0+IHtcbiAgICAgIHRyYXZlcnNlKHN1YiwgbGV2ZWwgKyAxKTtcbiAgICAgIC8vIGNvdW50Kys7XG4gICAgfSk7XG4gICAgLy8gaWYgKGNvdW50ID09PSAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhfLnJlcGVhdCgnIHwtICcsIGxldmVsICsgMSksIGBcIiR7YXN0LmdldFRleHQoc0ZpbGUpfVwiYCk7XG4gICAgLy8gfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUeXBlc2NyaXB0UGFyc2VyIHtcbiAgc3JjZmlsZTogdHMuU291cmNlRmlsZTtcblxuICBwcml2YXRlIF9hZGRQYXRjaDogKHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCBtb2R1bGVOYW1lOiBzdHJpbmcsIHJlcGxhY2VUeXBlOiBSZXBsYWNlVHlwZSkgPT4gdm9pZDtcbiAgcHJpdmF0ZSBfYWRkUGF0Y2g0SW1wb3J0OiAoYWxsU3RhcnQ6IG51bWJlciwgYWxsRW5kOiBudW1iZXIsIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLFxuICAgIG1vZHVsZU5hbWU6IHN0cmluZywgaW5mbzogUGFyc2VJbmZvKSA9PiB2b2lkO1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgZXNSZXBsYWNlcjogUmVwbGFjZVJlcXVpcmUgfCBudWxsID0gbnVsbCkge31cblxuICByZXBsYWNlKGNvZGU6IHN0cmluZywgZmFjdG9yeU1hcHM6IEZhY3RvcnlNYXBbXSB8IEZhY3RvcnlNYXAsIGZpbGVQYXRoOiBzdHJpbmcsIGFzdD86IHRzLlNvdXJjZUZpbGUpOlxuICAgIHtyZXBsYWNlZDogc3RyaW5nIHwgbnVsbCwgcGF0Y2hlczogQXJyYXk8e3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCByZXBsYWNlbWVudDogc3RyaW5nfT59IHtcblxuICAgIGxldCBwYXRjaGVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHJlcGxhY2VtZW50OiBzdHJpbmd9PiA9IFtdO1xuICAgIGxldCBzZWxmID0gdGhpcztcbiAgICBjb25zdCBfZmFjdG9yeU1hcHMgPSAoW10gYXMgRmFjdG9yeU1hcFtdKS5jb25jYXQoZmFjdG9yeU1hcHMpO1xuICAgIHRoaXMuX2FkZFBhdGNoID0gZnVuY3Rpb24odGhpczogVHlwZXNjcmlwdFBhcnNlciwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIG1vZHVsZU5hbWU6IHN0cmluZywgcmVwbGFjZVR5cGU6IFJlcGxhY2VUeXBlKSB7XG4gICAgICBpZiAoISB0aGlzLmVzUmVwbGFjZXIpXG4gICAgICAgIHJldHVybjtcbiAgICAgIHRoaXMuZXNSZXBsYWNlci5hZGRQYXRjaChwYXRjaGVzLCBzdGFydCwgZW5kLCBtb2R1bGVOYW1lLCByZXBsYWNlVHlwZSwgX2ZhY3RvcnlNYXBzLCBmaWxlUGF0aCk7XG4gICAgfTtcbiAgICB0aGlzLl9hZGRQYXRjaDRJbXBvcnQgPSBmdW5jdGlvbihhbGxTdGFydDogbnVtYmVyLCBhbGxFbmQ6IG51bWJlciwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsXG4gICAgICBtb2R1bGVOYW1lOiBzdHJpbmcsIGluZm86IFBhcnNlSW5mbykge1xuICAgICAgICBfZmFjdG9yeU1hcHMuc29tZSgoZmFjdG9yeU1hcDogRmFjdG9yeU1hcCkgPT4ge1xuICAgICAgICB2YXIgc2V0dGluZyA9IGZhY3RvcnlNYXAubWF0Y2hSZXF1aXJlKGluZm8uZnJvbSk7XG4gICAgICAgIGlmIChzZXR0aW5nKSB7XG4gICAgICAgICAgdmFyIHJlcGxhY2VtZW50ID0gZmFjdG9yeU1hcC5nZXRSZXBsYWNlbWVudChzZXR0aW5nLCBSZXBsYWNlVHlwZS5pbXAsIGZpbGVQYXRoLCBpbmZvKSBhcyBSZXBsYWNlZFJlc3VsdDtcbiAgICAgICAgICBpZiAocmVwbGFjZW1lbnQgIT0gbnVsbCkge1xuICAgICAgICAgICAgcGF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICAgICAgc3RhcnQ6IHJlcGxhY2VtZW50LnJlcGxhY2VBbGwgPyBhbGxTdGFydCA6IHN0YXJ0LFxuICAgICAgICAgICAgICBlbmQ6IHJlcGxhY2VtZW50LnJlcGxhY2VBbGwgPyBhbGxFbmQgOiBlbmQsXG4gICAgICAgICAgICAgIHJlcGxhY2VtZW50OiByZXBsYWNlbWVudC5jb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChzZWxmLmVzUmVwbGFjZXIpXG4gICAgICAgICAgICAgIHNlbGYuZXNSZXBsYWNlci5lbWl0KCdyZXBsYWNlJywgaW5mby5mcm9tLCByZXBsYWNlbWVudC5jb2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMucGFyc2VUc1NvdXJjZShjb2RlLCBmaWxlUGF0aCwgYXN0KTtcbiAgICByZXR1cm4ge1xuICAgICAgcmVwbGFjZWQ6IHBhdGNoZXMubGVuZ3RoID4gMCA/IHBhdGNoVGV4dChjb2RlLCBwYXRjaGVzKSA6IG51bGwsXG4gICAgICBwYXRjaGVzXG4gICAgfTtcbiAgfVxuXG4gIHBhcnNlVHNTb3VyY2Uoc291cmNlOiBzdHJpbmcsIGZpbGU6IHN0cmluZywgYXN0PzogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMuc3JjZmlsZSA9IGFzdCB8fCB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUsIHNvdXJjZSwgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICBjb25zdCBhc3RzOiB0cy5Ob2RlW10gPSBbLi4udGhpcy5zcmNmaWxlLnN0YXRlbWVudHNdO1xuICAgIGxldCBub2RlID0gYXN0cy5zaGlmdCgpO1xuICAgIHdoaWxlIChub2RlICE9IG51bGwpIHtcbiAgICAgIHRoaXMudHJhdmVyc2VUc0FzdChub2RlLCB0aGlzLnNyY2ZpbGUsIGFzdHMpO1xuICAgICAgbm9kZSA9IGFzdHMuc2hpZnQoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHRyYXZlcnNlVHNBc3QoYXN0OiB0cy5Ob2RlLCBzcmNmaWxlOiB0cy5Tb3VyY2VGaWxlLCB2aXNpdExhdGVyOiB0cy5Ob2RlW10pIHtcbiAgICBsZXQgU3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQ7XG4gICAgaWYgKGFzdC5raW5kID09PSBTeW50YXhLaW5kLkltcG9ydERlY2xhcmF0aW9uIHx8IGFzdC5raW5kID09PSBTeW50YXhLaW5kLkV4cG9ydERlY2xhcmF0aW9uKSB7XG4gICAgICBsZXQgbm9kZSA9IGFzdCBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbjtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdmb3VuZCBpbXBvcnQgc3RhdGVtZW50OicsIGFzdC5nZXRUZXh0KHNyY2ZpbGUpKTtcbiAgICAgIGxldCBwYXJzZUluZm8gPSBuZXcgUGFyc2VJbmZvKCk7XG4gICAgICBpZiAoIW5vZGUubW9kdWxlU3BlY2lmaWVyICYmIGFzdC5raW5kID09PSBTeW50YXhLaW5kLkV4cG9ydERlY2xhcmF0aW9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBhcnNlSW5mby5mcm9tID0gKG5vZGUubW9kdWxlU3BlY2lmaWVyIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG5cbiAgICAgIC8vIHBhcnNlSW5mby5mcm9tID0gL15bICdcIl0qKFteJ1wiXSspWyAnXCJdKiQvLmV4ZWMoc3JjZmlsZS50ZXh0LnN1YnN0cmluZyhub2RlLm1vZHVsZVNwZWNpZmllci5nZXRTdGFydCh0aGlzLnNyY2ZpbGUsIGZhbHNlKSwgbm9kZS5tb2R1bGVTcGVjaWZpZXIuZ2V0RW5kKCkpKVsxXTtcbiAgICAgIGlmIChfLmdldChub2RlLCAnaW1wb3J0Q2xhdXNlLm5hbWUnKSkge1xuICAgICAgICBwYXJzZUluZm8uZGVmYXVsdFZhciA9IG5vZGUuaW1wb3J0Q2xhdXNlIS5uYW1lIS50ZXh0O1xuICAgICAgfVxuICAgICAgaWYgKF8uZ2V0KG5vZGUsICdpbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncycpKSB7XG4gICAgICAgIGxldCBuYiA9IG5vZGUuaW1wb3J0Q2xhdXNlIS5uYW1lZEJpbmRpbmdzITtcbiAgICAgICAgaWYgKG5iLmtpbmQgPT09IFN5bnRheEtpbmQuTmFtZXNwYWNlSW1wb3J0KSB7XG4gICAgICAgICAgcGFyc2VJbmZvLm5hbWVzcGFjZVZhciA9IG5iLm5hbWUudGV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuYi5lbGVtZW50cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgcGFyc2VJbmZvLnZhcnNbZWxlbWVudC5uYW1lLnRleHRdID0gZWxlbWVudC5wcm9wZXJ0eU5hbWUgPyBlbGVtZW50LnByb3BlcnR5TmFtZS50ZXh0IDogZWxlbWVudC5uYW1lLnRleHQ7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuX2FkZFBhdGNoNEltcG9ydChub2RlLmdldFN0YXJ0KHRoaXMuc3JjZmlsZSwgZmFsc2UpLCBub2RlLmdldEVuZCgpLCBub2RlLm1vZHVsZVNwZWNpZmllci5nZXRTdGFydCh0aGlzLnNyY2ZpbGUsIGZhbHNlKSxcbiAgICAgICAgbm9kZS5tb2R1bGVTcGVjaWZpZXIuZ2V0RW5kKCksIHBhcnNlSW5mby5mcm9tLCBwYXJzZUluZm8pO1xuICAgICAgLy8gY29uc29sZS5sb2coZ2V0VGV4dE9mKG5vZGUubW9kdWxlU3BlY2lmaWVyLCBzcmNmaWxlKSk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgbGV0IG5vZGUgPSBhc3QgYXMgdHMuQ2FsbEV4cHJlc3Npb247XG4gICAgICBpZiAobm9kZS5leHByZXNzaW9uLmtpbmQgPT09IFN5bnRheEtpbmQuSWRlbnRpZmllciAmJlxuICAgICAgICAobm9kZS5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJlxuICAgICAgICBub2RlLmFyZ3VtZW50c1swXS5raW5kID09PSBTeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ0ZvdW5kJywgZ2V0VGV4dE9mKG5vZGUsIHNyY2ZpbGUpKTtcbiAgICAgICAgdGhpcy5fYWRkUGF0Y2gobm9kZS5nZXRTdGFydCh0aGlzLnNyY2ZpbGUsIGZhbHNlKSwgbm9kZS5nZXRFbmQoKSwgKG5vZGUuYXJndW1lbnRzWzBdIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQsIFJlcGxhY2VUeXBlLnJxKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5JbXBvcnRLZXl3b3JkKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdGb3VuZCBpbXBvcnQoKSAnLCBub2RlLmFyZ3VtZW50cy5tYXAoYXJnID0+IChhcmcgYXMgYW55KS50ZXh0KSk7XG4gICAgICAgIHRoaXMuX2FkZFBhdGNoKG5vZGUuZ2V0U3RhcnQodGhpcy5zcmNmaWxlLCBmYWxzZSksIG5vZGUuZ2V0RW5kKCksIChub2RlLmFyZ3VtZW50c1swXSBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBSZXBsYWNlVHlwZS5pbWEpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2UgaWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSBTeW50YXhLaW5kLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikge1xuICAgICAgICBsZXQgbGVmdCA9IChub2RlLmV4cHJlc3Npb24gYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5leHByZXNzaW9uO1xuICAgICAgICBsZXQgcmlnaHQgPSAobm9kZS5leHByZXNzaW9uIGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZTtcbiAgICAgICAgaWYgKGxlZnQua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmIChsZWZ0IGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJlxuICAgICAgICByaWdodC5raW5kID09PSBTeW50YXhLaW5kLklkZW50aWZpZXIgJiYgKHJpZ2h0IGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdlbnN1cmUnKSB7XG4gICAgICAgICAgbm9kZS5hcmd1bWVudHMuZm9yRWFjaCgoYXJnKSA9PiB7XG4gICAgICAgICAgICBpZiAoYXJnLmtpbmQgPT09IFN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICB0aGlzLl9hZGRQYXRjaChhcmcuZ2V0U3RhcnQodGhpcy5zcmNmaWxlLCBmYWxzZSksIGFyZy5nZXRFbmQoKSwgKGFyZyBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0LCBSZXBsYWNlVHlwZS5ycyk7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGByZXBsYWNlIHJlcXVpcmUuZW5zdXJlKCR7KGFyZyBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0fSlgKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXJnLmtpbmQgPT09IFN5bnRheEtpbmQuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICBjb25zdCBhcnJBcmcgPSBhcmcgYXMgdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBtb2R1bGVOYW1lQXN0IG9mIGFyckFyZy5lbGVtZW50cykge1xuICAgICAgICAgICAgICAgIGlmIChtb2R1bGVOYW1lQXN0LmtpbmQgIT09IFN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbcmVxdWlyZS1pbmplY3Rvcl0gcGFyc2UgJXMgZmFpbGVkLCBvbmx5IHN1cHBvcnQgYXJndW1lbnRzIG9mIGByZXF1aXJlLmVuc3VyZSgpYCBhcyBTdHJpbmdMaXRlcmFsJywgdGhpcy5zcmNmaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRQYXRjaChtb2R1bGVOYW1lQXN0LmdldFN0YXJ0KHRoaXMuc3JjZmlsZSwgZmFsc2UpLFxuICAgICAgICAgICAgICAgICAgbW9kdWxlTmFtZUFzdC5nZXRFbmQoKSwgKG1vZHVsZU5hbWVBc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCwgUmVwbGFjZVR5cGUucnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJ0ZvdW5kIHJlcXVpcmUuZW5zdXJlKCknLCBub2RlLmFyZ3VtZW50cy5tYXAoYXJnID0+IChhcmcgYXMgYW55KS50ZXh0KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdmlzaXRMYXRlci5wdXNoKC4uLmFzdC5nZXRDaGlsZHJlbigpKTtcbiAgfVxufVxuIl19