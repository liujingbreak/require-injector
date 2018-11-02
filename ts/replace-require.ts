import {Transform} from 'stream';
import patchText, {ReplacementInf} from './patch-text';
import {FactoryMap, ReplaceType, ReplacedResult, FactoryMapInterf} from './factory-map';
import Injector, {InjectorOption, ResolveOption} from './node-inject';
import * as _ from 'lodash';
var acorn = require('acorn');
var estraverse = require('estraverse-fb');
var acornjsx = require('acorn-jsx/inject')(acorn);
var acornImpInject = require('acorn-dynamic-import/lib/inject').default;
import through = require('through2');
var {parse: parseEs6Import, parseExport} = require('../dist/parse-esnext-import');
import {TypescriptParser} from './parse-ts-import';

var log = require('@log4js-node/log4js-api').getLogger('require-injector.replace-require');

acornjsx = acornImpInject(acornjsx);

export interface RequireInjector {
	fromPackage(packageName: string | string[], resolveOpt?: ResolveOption): FactoryMapInterf;
	fromDir(dir: string | string[]): FactoryMapInterf;
	transform(file: string): Transform;
	injectToFile(filePath: string, code: string, ast?: any): string;
	cleanup(): void;
}

export function replace(code: string, factoryMaps: FactoryMap[], fileParam: any, ast: any) {
	return new ReplaceRequire().replace(code, factoryMaps, fileParam, ast);
	// return ReplaceRequire.prototype.replace.apply(new ReplaceRequire(), arguments);
}
module.exports.parseCode = parseCode;

export default class ReplaceRequire extends Injector implements RequireInjector {

	transform: (file: string) => Transform;
	protected tsParser: TypescriptParser;
	/**
	 * opts.enableFactoryParamFile `true` if you need "filePath" as parameter for .factory(factory(filePath) {...})
	 * 	this will expose original source file path in code, default is `false`.
	 */
	constructor(opts?: InjectorOption) {
		super(opts);
		if (!(this instanceof ReplaceRequire)) {
			return new ReplaceRequire(opts);
		}
		var self = this;

		this.tsParser = new TypescriptParser(this);

		this.transform = function(file: string) {
			if (!_.endsWith(file, '.js')) {
				return through();
			}
			var data = '';
			return through(write, end);

			function write(buf: string, enc: string, next: through.TransformCallback) {
				data += buf; next();
			}
			function end(next: through.TransformCallback) {
				this.push(self.injectToFile(file, data));
				next();
			}
		};
	}

	cleanup() {
		this.removeAllListeners('replace');
		super.cleanup();
	}
	/**
	 * Here "inject" is actually "replacement".
	 Parsing a matched file to Acorn AST tree, looking for matched `require(module)` expression and replacing
	  them with proper values, expression.
	 * @name injectToFile
	 * @param  {string} filePath file path
	 * @param  {string} code     content of file
	 * @param  {object} ast      optional, if you have already parsed code to AST tree, pass it to this function which
	 *  helps to speed up process by skip parsing again.
	 * @return {string}          replaced source code, if there is no injectable `require()`,
	 * 	same source code will be returned.
	 */
	injectToFile(filePath: string, code: string, ast?: any) {
		var factoryMaps: FactoryMap[];
		try {
			factoryMaps = this.factoryMapsForFile(filePath);
			var replaced = null;
			if (factoryMaps.length > 0) {
				if (/\.tsx?$/.test(filePath)) {
					replaced = this.tsParser.replace(code, factoryMaps, filePath, ast);
				} else
					replaced = this.replace(code, factoryMaps, filePath, ast);
				if (replaced != null)
					return replaced;
			}
			return code;
		} catch (e) {
			log.error('filePath: ' + filePath);
			log.error(_.map(factoryMaps, factoryMap => factoryMap.requireMap).join());
			log.error(e.stack);
			throw e;
		}
	}

	/**
	 * @return null if there is no change
	 */
	replace(code: string, fm: FactoryMap | FactoryMap[], fileParam: string, ast?: any) {
		const factoryMaps = ([] as FactoryMap[]).concat(fm);
		var self = this;
		if (!ast) {
			ast = parseCode(code);
			self.emit('ast', ast);
		}

		var patches: ReplacementInf[] = [];

		estraverse.traverse(ast, {
			enter(node: any, parent: any) {
				if (node.type === 'CallExpression') {
					var calleeType = _.get(node, 'callee.type');
					var callee = node.callee;
					if (calleeType === 'Import') {
						self.onImportAsync(node, factoryMaps, fileParam, patches);
					}
					if (calleeType === 'Identifier') {
						var funcName = _.get(node, 'callee.name');
						if (funcName === 'require')
							self.onRequire(node, factoryMaps, fileParam, patches);
						else if (funcName === 'import')
							self.onImportAsync(node, factoryMaps, fileParam, patches);
					} else if (calleeType === 'MemberExpression' &&
						callee.object.name === 'require' &&
						callee.object.type === 'Identifier' &&
						callee.property.name === 'ensure' &&
						callee.property.type === 'Identifier') {
						self.onRequireEnsure(node, factoryMaps, fileParam, patches);
					}
				} else if (node.type === 'ImportDeclaration') {
					self.onImport(node, factoryMaps, fileParam, patches);
				} else if ((node.type === 'ExportNamedDeclaration' && node.source) ||
					(node.type === 'ExportAllDeclaration' && node.source)) {
					// self.onExport(node, factoryMaps, fileParam, patches);
					// TODO: support `export ... from ...`
				}
			},
			leave(node: any, parent: any) {
			},
			keys: {
				Import: [], JSXText: []
			}
		});
		if (patches.length > 0)
			return patchText(code, patches);
		else
			return null;
	}

	protected onImport(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]) {
		var info = parseEs6Import(node);
		var self = this;
		_.some(factoryMaps, factoryMap => {
			var setting = factoryMap.matchRequire(info.from);
			if (setting) {
				var replacement = factoryMap.getReplacement(setting, ReplaceType.imp, fileParam, info) as ReplacedResult;
				if (replacement != null) {
					patches.push({
						start: replacement.replaceAll ? node.start : node.source.start,
						end: replacement.replaceAll ? node.end : node.source.end,
						replacement: replacement.code
					});
					self.emit('replace', info.from, replacement.code);
				}
				return true;
			}
			return false;
		});
	}

	protected onExport(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]) {
		var info = parseExport(node);
		var self = this;
		_.some(factoryMaps, factoryMap => {
			var setting = factoryMap.matchRequire(info.from);
			if (setting) {
				var replacement = factoryMap.getReplacement(setting, ReplaceType.imp, fileParam, info) as ReplacedResult;
				if (replacement != null) {
					patches.push({
						start: replacement.replaceAll ? node.start : node.source.start,
						end: replacement.replaceAll ? node.end : node.source.end,
						replacement: replacement.code
					});
					self.emit('replace', info.from, replacement.code);
				}
				return true;
			}
			return false;
		});
	}

	protected onImportAsync(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]) {
		var old = _.get(node, 'arguments[0].value');
		this.addPatch(patches, node.start, node.end, old, ReplaceType.ima, factoryMaps, fileParam);
	}

	protected onRequire(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]) {
		var calleeType = _.get(node, 'callee.type');
		if (calleeType === 'Identifier' &&
		_.get(node, 'callee.name') === 'require') {
			var old = _.get(node, 'arguments[0].value');
			this.addPatch(patches, node.start, node.end, old, ReplaceType.rq, factoryMaps, fileParam);
		}
	}

	protected onRequireEnsure(node: any, factoryMaps: FactoryMap[], fileParam: string, patches: ReplacementInf[]) {
		var self = this;
		var args = node.arguments;
		if (args.length === 0) {
			return;
		}
		if (args[0].type === 'ArrayExpression') {
			args[0].elements.forEach((nameNode: any) => {
				if (nameNode.type !== 'Literal') {
					log.error('require.ensure() should be called with String literal');
					return;
				}
				var old = nameNode.value;
				self.addPatch(patches, nameNode.start, nameNode.end, old, ReplaceType.rs, factoryMaps, fileParam);
			});
		} else if (args[0].type === 'Literal') {
			var old = _.get(node, 'arguments[0].value');
			self.addPatch(patches, args[0].start, args[0].end, old, ReplaceType.rs, factoryMaps, fileParam);
		}
	}

	protected addPatch(patches: ReplacementInf[], start: number, end: number, moduleName: string,
		replaceType: ReplaceType, fmaps: FactoryMap[], fileParam: string) {
		var self = this;
		var setting;
		for (const factoryMap of fmaps) {
			setting = factoryMap.matchRequire(moduleName);
			if (setting) {
				var replacement = factoryMap.getReplacement(setting, replaceType, fileParam);
				if (replacement != null) {
					patches.push({
						start,
						end,
						replacement: typeof (replacement) === 'string' ? replacement as string : (replacement as ReplacedResult).code
					});
					self.emit('replace', moduleName, replacement);
				}
				break;
			}
		}
	}
}

export function parseCode(code: string) {
	var ast;
	var firstCompileErr = null;
	try {
		ast = acornjsx.parse(code, {allowHashBang: true, sourceType: 'module', plugins: {jsx: true, dynamicImport: true}});
	} catch (err) {
		firstCompileErr = err;
		try {
			ast = acornjsx.parse(code, {allowHashBang: true, plugins: {jsx: true, dynamicImport: true}});
		} catch (err2) {
			log.error('Possible ES compilation error', firstCompileErr);
			firstCompileErr.message += '\nOr ' + err2.message;
			firstCompileErr.stack += '\nAnother possible compilation error is\n' + err2.stack;
			throw firstCompileErr;
		}
	}
	return ast;
}
