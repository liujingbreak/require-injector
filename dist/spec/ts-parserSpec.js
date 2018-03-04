"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import * as ts from 'typescript';
const fs = require("fs");
const Path = require("path");
// import * as _ from 'lodash';
const parse_ts_import_1 = require("../parse-ts-import");
describe("Typescript AST", () => {
    it("can be generated by typescript lib", () => {
        let source = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/test-ts.txt'), 'utf8');
        var infos = parse_ts_import_1.parseTsSource(source);
        console.log(infos);
        // let sFile = ts.createSourceFile('test-ts.ts', source,
        // 	ts.ScriptTarget.ES2015);
        // traverse(sFile);
        // function traverse(ast: ts.Node, level = 0) {
        // 	console.log(_.repeat(' |- ', level) + ts.SyntaxKind[ast.kind]);
        // 	let count = 0;
        // 	ast.forEachChild((sub: ts.Node) => {
        // 		traverse(sub, level + 1);
        // 		count++;
        // 	});
        // 	if (count === 0) {
        // 		console.log(_.repeat(' |- ', level + 1), `"${source.substring(ast.getStart(sFile), ast.getEnd())}"`);
        // 	}
        // }
    });
});
exports.default = {
    ok: 1
};
//# sourceMappingURL=ts-parserSpec.js.map