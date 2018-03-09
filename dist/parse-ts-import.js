"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const fs = require("fs");
const Path = require("path");
const _ = require("lodash");
const parse_esnext_import_1 = require("./parse-esnext-import");
var patchText = require('../lib/patch-text.js');
function parseTs(file) {
    // let source = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/test-ts.txt'), 'utf8');
    let source = fs.readFileSync(Path.resolve(file), 'utf8');
    let sFile = ts.createSourceFile('test-ts.ts', source, ts.ScriptTarget.ES2015);
    traverse(sFile);
    function traverse(ast, level = 0) {
        console.log(_.repeat(' |- ', level) + ts.SyntaxKind[ast.kind]);
        if (ast.kind === ts.SyntaxKind.ImportDeclaration) {
            console.log('found import statement', ast.getText(sFile));
            debugger;
        }
        let count = 0;
        ast.forEachChild((sub) => {
            traverse(sub, level + 1);
            count++;
        });
        if (count === 0) {
            console.log(_.repeat(' |- ', level + 1), `"${source.substring(ast.getStart(sFile), ast.getEnd())}"`);
        }
    }
}
exports.parseTs = parseTs;
class TypescriptParser {
    constructor(esReplacer = null) {
        this.esReplacer = esReplacer;
    }
    replace(code, factoryMaps, fileParam) {
        let patches = [];
        let self = this;
        factoryMaps = [].concat(factoryMaps);
        this._addPatch = function (start, end, moduleName, replaceType) {
            if (!this.esReplacer)
                return;
            this.esReplacer.addPatch(patches, start, end, moduleName, replaceType, factoryMaps, fileParam);
        };
        this._addPatch4Import = function (allStart, allEnd, start, end, moduleName, info) {
            _.some(factoryMaps, (factoryMap) => {
                var setting = factoryMap.matchRequire(info.from);
                if (setting) {
                    var replacement = factoryMap.getReplacement(setting, 'imp', fileParam, info);
                    if (replacement != null) {
                        patches.push({
                            start: replacement.replaceAll ? allStart : start,
                            end: replacement.replaceAll ? allEnd : end,
                            replacement: ' ' + replacement.code
                        });
                        if (self.esReplacer)
                            self.esReplacer.emit('replace', info.from, replacement.code);
                    }
                    return true;
                }
                return false;
            });
        };
        this.parseTsSource(code, fileParam);
        return patchText(code, patches);
    }
    parseTsSource(source, file) {
        console.log(file);
        let srcfile = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, false, ts.ScriptKind.TSX);
        for (let stm of srcfile.statements) {
            this.traverseTsAst(stm, srcfile);
        }
    }
    traverseTsAst(ast, srcfile, level = 0) {
        if (ast.kind === ts.SyntaxKind.ImportDeclaration) {
            let node = ast;
            // console.log('found import statement:', ast.getText(srcfile));
            let parseInfo = new parse_esnext_import_1.ParseInfo();
            parseInfo.from = /^[ '"]*([^'"]+)[ '"]*$/.exec(srcfile.text.substring(node.moduleSpecifier.pos, node.moduleSpecifier.end))[1];
            if (_.get(node, 'importClause.name')) {
                parseInfo.defaultVars.push(node.importClause.name.text);
            }
            if (_.get(node, 'importClause.namedBindings')) {
                let nb = node.importClause.namedBindings;
                if (nb.kind === ts.SyntaxKind.NamespaceImport)
                    parseInfo.vars[nb.name.text] = '*';
                else {
                    nb.elements.forEach(element => {
                        parseInfo.vars[element.name.text] = element.propertyName ? element.propertyName.text : element.name.text;
                    });
                }
            }
            this._addPatch4Import(node.pos, node.end, node.moduleSpecifier.pos, node.moduleSpecifier.end, parseInfo.from, parseInfo);
            // console.log(getTextOf(node.moduleSpecifier, srcfile));
            return;
        }
        else if (ast.kind === ts.SyntaxKind.CallExpression) {
            let node = ast;
            if (node.expression.kind === ts.SyntaxKind.Identifier &&
                node.expression.text === 'require' &&
                node.arguments[0].kind === ts.SyntaxKind.StringLiteral) {
                // console.log('Found', getTextOf(node, srcfile));
                this._addPatch(node.pos, node.end, node.arguments[0].text, 'rq');
                return;
            }
            else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
                // console.log('Found import() ', node.arguments.map(arg => (arg as any).text));
                this._addPatch(node.pos, node.end, node.arguments[0].text, 'ima');
                return;
            }
            else if (node.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
                let left = node.expression.expression;
                let right = node.expression.name;
                if (left.kind === ts.SyntaxKind.Identifier && left.text === 'require' &&
                    right.kind === ts.SyntaxKind.Identifier && right.text === 'ensure') {
                    node.arguments.forEach((arg) => {
                        if (arg.kind === ts.SyntaxKind.StringLiteral) {
                            this._addPatch(arg.pos, arg.end, arg.text, 'rs');
                            console.log(`replace require.ensure(${arg.text})`);
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
// function getTextOf(ast: ts.Node, srcfile: ts.SourceFile): string {
// 	return srcfile.text.substring(ast.pos, ast.end);
// }
//# sourceMappingURL=parse-ts-import.js.map