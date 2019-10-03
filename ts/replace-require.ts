import {Transform} from 'stream';
import {FactoryMap, FactoryMapInterf, ReplaceType, ReplacedResult} from './factory-map';
import Injector, {InjectorOption, ResolveOption} from './node-inject';
import * as _ from 'lodash';
import {ReplacementInf} from './patch-text';


import through = require('through2');
import {TypescriptParser} from './parse-ts-import';

var log = require('@log4js-node/log4js-api').getLogger('require-injector.replace-require');


export interface RequireInjector {
	fromPackage(packageName: string | string[], resolveOpt?: ResolveOption): FactoryMapInterf;
	fromDir(dir: string | string[]): FactoryMapInterf;
	fromRoot(): FactoryMapInterf;
	transform(file: string): Transform;
	injectToFile(filePath: string, code: string, ast?: any): string;
	cleanup(): void;
}
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
		var factoryMaps: FactoryMap[]|undefined;
		try {
			factoryMaps = this.factoryMapsForFile(filePath);
			var replaced = null;
			if (factoryMaps.length > 0) {
				// if (/\.tsx?$/.test(filePath)) {
					replaced = this.tsParser.replace(code, factoryMaps, filePath, ast);
				// } else
					// replaced = this.replace(code, factoryMaps, filePath, ast);
				if (replaced != null)
					return replaced;
			}
			return code;
		} catch (e) {
			log.error('filePath: ' + filePath);
			if (factoryMaps != null)
				log.error(_.map(factoryMaps, factoryMap => factoryMap.requireMap).join());
			log.error(e.stack);
			throw e;
		}
	}

	addPatch(patches: ReplacementInf[], start: number, end: number, moduleName: string,
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

