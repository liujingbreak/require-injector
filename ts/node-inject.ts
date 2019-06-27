import Module = require('module');
import * as  _ from 'lodash';
var resolve = require('resolve').sync;
var mothership = require('mothership').sync;
import EventEmitter = require('events');
var Path = require('path');
import {DirTree} from './dir-tree';
var log = require('@log4js-node/log4js-api').getLogger('require-injector.node-inject');
var fs = require('fs');

import {FactoryMap, FactoryMapInterf, FactoryMapCollection, FactoryFunc} from './factory-map';
export {FactoryMap, FactoryMapInterf, FactoryMapCollection};
module.exports.parseSymlink = parseSymlink;


var emptyFactoryMap = {
	factory: emptryChainableFunction,
	substitute: emptryChainableFunction,
	alias: emptryChainableFunction,
	replaceCode: emptryChainableFunction,
	value:  emptryChainableFunction
} as FactoryMapInterf;

export interface InjectorOption {
	/**
	 * default is process.cwd(), used to resolve relative path in `.fromDir(path)`
	 */
	basedir?: string;
	/**
	 * default is false, if you only use this module as Browserify or Webpack's transform,
	 * you don't want injection work on Node side, no kidnapping on `Module.prototype.require`,
	 * set this property to `true`
	 */
	noNode?: boolean;
	resolve?: (path: string) => string;
	resolveOpts?: any;
	debug?: boolean;
}

/**
 * browser-resolve options
 */
export interface ResolveOption {
	baseDir?: string;
}
class Injector extends EventEmitter {

	dirTree: DirTree<FactoryMap>;
	oldRequire: NodeRequireFunction;
	config: InjectorOption;

	constructor(opts?: InjectorOption) {
		super();
		// this.sortedDirs = [];
		this.dirTree = new DirTree();
		// this.injectionScopeMap = {};
		this.oldRequire = Module.prototype.require;
		this._initOption(opts);
	}

	cleanup() {
		Module.prototype.require = this.oldRequire;
		// this.sortedDirs.splice(0);
		this.dirTree = new DirTree();
		// var self = this;
		// _.each(_.keys(self.injectionScopeMap), function(key) {
		// 	delete self.injectionScopeMap[key];
		// });
		this.config = {};
		if (this.config.debug)
			log.debug('cleanup');
	}

	fromPackage(packageName: string | string[], resolveOpts?: ResolveOption): FactoryMapInterf {
		if (Array.isArray(packageName)) {
			var args = [].slice.call(arguments);
			var factoryMaps = _.map(packageName as string[], single => {
				args[0] = single;
				return this._fromPackage.apply(this, args);
			});
			return new FactoryMapCollection(factoryMaps);
		} else {
			return this._fromPackage(packageName, resolveOpts);
		}
	}

	_fromPackage(packageName: string, resolveOpts?: ResolveOption): FactoryMapInterf {
		var resolveSync = resolve;
		if (this.config.resolve) {
			resolveSync = this.config.resolve;
		}

		if (_.isFunction(resolveOpts)) {
			resolveSync = resolveOpts;
			resolveOpts = arguments[2];
		}

		if (!resolveOpts) {
			resolveOpts = this.config.resolveOpts;
		}
		var mainJsPath, jsonPath;
		try {
			mainJsPath = resolveSync(packageName, resolveOpts);
			jsonPath = mothership(mainJsPath, function(json: {[k: string]: any}) {
				return json.name === packageName;
			}).path;
		} catch (e) {
			if (e.code === 'MODULE_NOT_FOUND') {
				log.info(packageName + ' is not Found, will be skipped from .fromPackage()');
				return emptyFactoryMap;
			}
			throw e;
		}
		if (jsonPath == null) {
			log.info(packageName + ' is not Found, will be skipped from .fromPackage()');
			return emptyFactoryMap;
		}
		var path = Path.dirname(jsonPath);
		return this._fromDir(path, this.dirTree);
	}

	fromDir(dir: string | string[]): FactoryMapInterf {
		if (_.isArray(dir)) {
			var args = [].slice.call(arguments);
			var factoryMaps = _.map(dir, single => {
				args[0] = single;
				return this.resolveFromDir.apply(this, args);
			});
			return new FactoryMapCollection(factoryMaps);
		} else {
			return this.resolveFromDir(dir);
		}
	}

	resolveFromDir(dir: string): FactoryMapInterf {
		var path = this.config.basedir ?
			Path.resolve(this.config.basedir, dir) : Path.resolve(dir);
		return this._fromDir(path, this.dirTree);
	}

	/**
	 * Recursively build dirTree, subDirMap
	 * @param  {string} path new directory
	 * @param  {Array<string>} dirs [description]
	 * @return {[type]}      [description]
	 */
	_fromDir(path: string, tree: DirTree<FactoryMap>): FactoryMap {
		var factory: FactoryMap | undefined;
		var linked = parseSymlink(path);
		if (linked !== path) {
			log.debug('%s is symbolic link path to %s', path, linked);
			factory = this._createFactoryMapFor(linked, tree);
		}
		return this._createFactoryMapFor(path, tree, factory);
	}

	_createFactoryMapFor(path: string, tree: DirTree<FactoryMap>, existingFactory?: FactoryMap): FactoryMap {
		// path = this._pathToSortKey(path);
		if (!existingFactory) {
			var f = tree.getData(path);
			if (f) {
				return f;
			} else {
				f = new FactoryMap(this.config);
				tree.putData(path, f);
				return f;
			}
		} else {
			tree.putData(path, existingFactory);
			return existingFactory;
		}
	}

	/**
	 * Return array of configured FactoryMap for source code file depends on the file's location.
	 * Later on, you can call `factoryMap.matchRequire(name)` to get exact inject value
	 * @return {FactoryMap[]} Empty array if there is no injector configured for current file
	 */
	factoryMapsForFile(fromFile: string): FactoryMap[] {
		var fmaps = this.dirTree.getAllData(fromFile);
		return _.reverse(fmaps);
	}

	testable() {
		return this;
	}
	protected _initOption(opts?: InjectorOption) {
		this.config = opts ? opts : {};

		var self = this;
		if (!_.get(opts, 'noNode')) {
			Module.prototype.require = function(path) {
				return self.replacingRequire(this, path);
			};
		} else {
			this.config.resolve = this.config.resolve ? this.config.resolve : require('browser-resolve').sync;
		}
	}
	protected inject(calleeModule: Module, name: string) {
		// var dir = this.quickSearchDirByFile(calleeModule.id);
		var fmaps = this.factoryMapsForFile(calleeModule.id);
		if (fmaps.length === 0)
			return this.oldRequire.call(calleeModule, name);
		var injected;
		var match = _.some(fmaps, factoryMap => {
			var injector = factoryMap.matchRequire(name);
			if (injector == null) {
				return false;
			}
			if (this.config.debug) {
				log.debug('inject %s', name);
			}
			injected = factoryMap.getInjected(injector, calleeModule.id, calleeModule, this.oldRequire);
			this.emit('inject', calleeModule.id);
			return true;
		});
		if (!match)
			return this.oldRequire.call(calleeModule, name);
		return injected;
	}

	protected replacingRequire(calleeModule: Module, path: string) {
		try {
			return this.inject(calleeModule, path);
		} catch (e) {
			if (this.config.debug)
				log.debug('require from : ', calleeModule.id, e.message);
			throw e;
		}
	}
}

export {Injector as default, Injector as NodeInjector};

/**
 * If a path contains symbolic link, return the exact real path
 * Unlike fs.realpath, it also works for nonexist path
 * @return {[type]} [description]
 */
export function parseSymlink(path: string) {
	try {
		fs.accessSync(path, fs.F_OK);
		return fs.realpathSync(path);
	} catch (e) {}
	path = Path.resolve(path);
	var parsed = Path.parse(path);
	var dir = parsed.root;
	var pathElements = path.split(Path.sep).slice(1);
	pathElements.some((el, index) => {
		if (!_.endsWith(dir, Path.sep))
			dir += Path.sep;
		dir += el;
		try {
			fs.accessSync(dir, fs.F_OK);
		} catch (e) {
			var restPart = pathElements.slice(index + 1).join(Path.sep);
			dir += restPart.length > 0 ? Path.sep + restPart : restPart;
			return true;
		}
		if (fs.lstatSync(dir).isSymbolicLink()) {
			var link = fs.readlinkSync(dir);
			dir = Path.resolve(Path.dirname(dir), link);
		}
		return false;
	});
	return dir;
}

function emptryChainableFunction(name: string | RegExp, RegExp: string| FactoryFunc): FactoryMapInterf {
	return emptyFactoryMap;
}
