import * as ts from 'typescript';
import * as fs from 'fs';
import * as Path from 'path';
import * as _ from 'lodash';
import {ParseInfo} from './parse-esnext-import';
export function parseTs(file: string) {
	// let source = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/test-ts.txt'), 'utf8');
	let source = fs.readFileSync(Path.resolve(file), 'utf8');
	let sFile = ts.createSourceFile('test-ts.ts', source,
		ts.ScriptTarget.ES2015);
	traverse(sFile);
	function traverse(ast: ts.Node, level = 0) {
		console.log(_.repeat(' |- ', level) + ts.SyntaxKind[ast.kind]);
		if (ast.kind === ts.SyntaxKind.ImportDeclaration) {
			console.log('found import statement', ast.getText(sFile));
			debugger;
		}
		let count = 0;
		ast.forEachChild((sub: ts.Node) => {
			traverse(sub, level + 1);
			count++;
		});
		if (count === 0) {
			console.log(_.repeat(' |- ', level + 1), `"${source.substring(ast.getStart(sFile), ast.getEnd())}"`);
		}
	}
}

export function replace(code: string, factoryMaps: any, fileParam: any): string {
	parseTsSource(code);
	return '';
}

export function parseTsSource(source: string): ParseInfo[] {
	let srcfile = ts.createSourceFile('test-ts.ts', source, ts.ScriptTarget.ES2015);
	let parseInfos: ParseInfo[] = [];
	for(let stm of srcfile.statements) {
		traverseTsAst(stm, srcfile, parseInfos);
	}
	return parseInfos;
}

function traverseTsAst(ast: ts.Node, srcfile: ts.SourceFile, parseInfos: ParseInfo[], level = 0) {
	if (ast.kind === ts.SyntaxKind.ImportDeclaration) {
		let node = ast as ts.ImportDeclaration;
		console.log('found import statement:', ast.getText(srcfile));
		let parseInfo = new ParseInfo();
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
	} else if (ast.kind === ts.SyntaxKind.CallExpression) {
		let node = ast as ts.CallExpression;
		if (node.expression.kind === ts.SyntaxKind.Identifier &&
			(node.expression as ts.Identifier).text === 'require' &&
			node.arguments[0].kind === ts.SyntaxKind.StringLiteral) {
			console.log('Found require() ', node.arguments.map(arg => (arg as any).text));
			return;
		} else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			console.log('Found import() ', node.arguments.map(arg => (arg as any).text));
			return;
		} else if (node.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
			let left = (node.expression as ts.PropertyAccessExpression).expression;
			let right = (node.expression as ts.PropertyAccessExpression).name;
			if (left.kind === ts.SyntaxKind.Identifier && (left as ts.Identifier).text === 'require' &&
			right.kind === ts.SyntaxKind.Identifier && (right as ts.Identifier).text === 'ensure') {
				console.log('Found require.ensure()', node.arguments.map(arg => (arg as any).text));
			}
		}
		// console.log('#', getTextOf(node.expression, srcfile), (node.expression as ts.Identifier).text);
	}
	ast.forEachChild((sub: ts.Node) => {
		traverseTsAst(sub, srcfile, parseInfos, level + 1);
	});
}


function getTextOf(ast: ts.Node, srcfile: ts.SourceFile): string {
	return srcfile.text.substring(ast.pos, ast.end);
}
