import * as ts from 'typescript';
import * as fs from 'fs';
import * as Path from 'path';
import * as _ from 'lodash';
import {ParseInfo} from './parse-esnext-import';
import {FactoryMap} from './factory-map';

var patchText = require('../lib/patch-text.js');
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

export class TypescriptParser {
	constructor(public esReplacer: any = null) {}

	private _addPatch: (start: number, end: number, moduleName: string, replaceType: string) => void;
	private _addPatch4Import: (allStart: number, allEnd: number, start: number, end: number,
		moduleName: string, info: ParseInfo) => void;

	replace(code: string, factoryMaps: FactoryMap[] | FactoryMap, fileParam: any): string | null {
		let patches: {start: number, end: number, replacement: string}[] = [];
		let self = this;
		factoryMaps = [].concat(factoryMaps);
		this._addPatch = function(start: number, end: number, moduleName: string, replaceType: string) {
			if (! this.esReplacer)
				return;
			this.esReplacer.addPatch(patches, start, end, moduleName, replaceType, factoryMaps, fileParam);
		};
		this._addPatch4Import = function(allStart: number, allEnd: number, start: number, end: number,
			moduleName: string, info: ParseInfo) {
			_.some(factoryMaps, (factoryMap: FactoryMap) => {
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
		return patches.length > 0 ? patchText(code, patches) : null;
	}

	parseTsSource(source: string, file: string): void{
		console.log(file);
		let srcfile = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext,
			false, ts.ScriptKind.TSX);
		for(let stm of srcfile.statements) {
			this.traverseTsAst(stm, srcfile);
		}
	}

	private traverseTsAst(ast: ts.Node, srcfile: ts.SourceFile, level = 0) {
		if (ast.kind === ts.SyntaxKind.ImportDeclaration) {
			let node = ast as ts.ImportDeclaration;
			// console.log('found import statement:', ast.getText(srcfile));
			let parseInfo = new ParseInfo();
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
			this._addPatch4Import(node.pos, node.end, node.moduleSpecifier.pos, node.moduleSpecifier.end, parseInfo.from,
				parseInfo);
			// console.log(getTextOf(node.moduleSpecifier, srcfile));
			return;
		} else if (ast.kind === ts.SyntaxKind.CallExpression) {
			let node = ast as ts.CallExpression;
			if (node.expression.kind === ts.SyntaxKind.Identifier &&
				(node.expression as ts.Identifier).text === 'require' &&
				node.arguments[0].kind === ts.SyntaxKind.StringLiteral) {
				// console.log('Found', getTextOf(node, srcfile));
				this._addPatch(node.pos, node.end, (node.arguments[0] as ts.StringLiteral).text, 'rq');
				return;
			} else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
				// console.log('Found import() ', node.arguments.map(arg => (arg as any).text));
				this._addPatch(node.pos, node.end, (node.arguments[0] as ts.StringLiteral).text, 'ima');
				return;
			} else if (node.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
				let left = (node.expression as ts.PropertyAccessExpression).expression;
				let right = (node.expression as ts.PropertyAccessExpression).name;
				if (left.kind === ts.SyntaxKind.Identifier && (left as ts.Identifier).text === 'require' &&
				right.kind === ts.SyntaxKind.Identifier && (right as ts.Identifier).text === 'ensure') {
					node.arguments.forEach((arg) => {
						if (arg.kind === ts.SyntaxKind.StringLiteral) {
							this._addPatch(arg.pos, arg.end, (arg as ts.StringLiteral).text, 'rs');
							console.log(`replace require.ensure(${(arg as ts.StringLiteral).text})`);
						}
					});
					// console.log('Found require.ensure()', node.arguments.map(arg => (arg as any).text));
				}
			}
		}
		ast.forEachChild((sub: ts.Node) => {
			this.traverseTsAst(sub, srcfile, level + 1);
		});
	}
}

// function getTextOf(ast: ts.Node, srcfile: ts.SourceFile): string {
// 	return srcfile.text.substring(ast.pos, ast.end);
// }
