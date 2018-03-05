"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const fs = require("fs");
const Path = require("path");
const _ = require("lodash");
const parse_esnext_import_1 = require("./parse-esnext-import");
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
function replace(code, factoryMaps, fileParam) {
    parseTsSource(code);
    return '';
}
exports.replace = replace;
function parseTsSource(source) {
    let srcfile = ts.createSourceFile('test-ts.ts', source, ts.ScriptTarget.ES2015);
    let parseInfos = [];
    for (let stm of srcfile.statements) {
        traverseTsAst(stm, srcfile, parseInfos);
    }
    return parseInfos;
}
exports.parseTsSource = parseTsSource;
function traverseTsAst(ast, srcfile, parseInfos, level = 0) {
    if (ast.kind === ts.SyntaxKind.ImportDeclaration) {
        let node = ast;
        console.log('found import statement:', ast.getText(srcfile));
        let parseInfo = new parse_esnext_import_1.ParseInfo();
        parseInfo.from = /^[ '"]*([^'"]+)[ '"]*$/.exec(srcfile.text.substring(node.moduleSpecifier.pos, node.moduleSpecifier.end))[1];
        if (node.importClause.name) {
            parseInfo.defaultVars.push(node.importClause.name.text);
        }
        var nb = node.importClause.namedBindings;
        if (nb) {
            if (nb.kind === ts.SyntaxKind.NamespaceImport)
                parseInfo.vars[nb.name.text] = '*';
            else {
                nb.elements.forEach(element => {
                    parseInfo.vars[element.name.text] = element.propertyName ? element.propertyName.text : element.name.text;
                });
            }
        }
        parseInfos.push(parseInfo);
        return;
    }
    else if (ast.kind === ts.SyntaxKind.CallExpression) {
        let node = ast;
        if (node.expression.kind === ts.SyntaxKind.Identifier &&
            node.expression.text === 'require' &&
            node.arguments[0].kind === ts.SyntaxKind.StringLiteral) {
            console.log('Found require() ', node.arguments.map(arg => arg.text));
            return;
        }
        else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            console.log('Found import() ', node.arguments.map(arg => arg.text));
            return;
        }
        else if (node.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
            let left = node.expression.expression;
            let right = node.expression.name;
            if (left.kind === ts.SyntaxKind.Identifier && left.text === 'require' &&
                right.kind === ts.SyntaxKind.Identifier && right.text === 'ensure') {
                console.log('Found require.ensure()', node.arguments.map(arg => arg.text));
            }
        }
        // console.log('#', getTextOf(node.expression, srcfile), (node.expression as ts.Identifier).text);
    }
    ast.forEachChild((sub) => {
        traverseTsAst(sub, srcfile, parseInfos, level + 1);
    });
}
function getTextOf(ast, srcfile) {
    return srcfile.text.substring(ast.pos, ast.end);
}
//# sourceMappingURL=parse-ts-import.js.map