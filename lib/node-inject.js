var Module = require('module');
var _ = require('lodash');
var resolve = require('resolve').sync;
var mothership = require('mothership').sync;
var EventEmitter = require('events');
var Path = require('path');
const DirTree = require('./dir-tree').DirTree;
var log = require('log4js').getLogger('require-injector.node-inject');
log.setLevel('info');
var fs = require('fs');

module.exports = Injector;
var defaultInstance;
module.exports.getInstance = function() {
	return defaultInstance;
};

var FactoryMap = require('./factory-map').FactoryMap;
var FactoryMapCollection = require('./factory-map').FactoryMapCollection;
module.exports.FactoryMap = FactoryMap;
module.exports.FactoryMapCollection = FactoryMapCollection;
module.exports.parseSymlink = parseSymlink;


var emptyFactoryMap = {
	factory: emptryChainableFunction,
	substitute: emptryChainableFunction,
	alias: emptryChainableFunction,
	replaceCode: emptryChainableFunction,
	value:  emptryChainableFunction
};
/**
 * [Injector description]
 * Injector.injectionScopeMap: dir -> FactoryMap
 * FactoryMap.requireMap: module name -> factory function
 * @param {object} opts optional
 * @param {string} opts.basedir default is process.cwd(), used to resolve relative path in `.fromDir(path)`
 * @param {boolean} opts.noNode default is false, if you only use this module as Browserify or Webpack's transform, you don't want injection work on Node side, no kidnapping on `Module.prototype.require`, set this property to `true`
 */
function Injector(opts) {
	if (!(this instanceof Injector)) {
		return new Injector(opts);
	}
	//this.sortedDirs = [];
	this.dirTree = new DirTree();
	//this.injectionScopeMap = {};
	this.oldRequire = Module.prototype.require;
	this.config = opts ? opts : {};

	var self = this;
	if (!_.get(opts, 'noNode')) {
		Module.prototype.require = function(path) {
			return self.replacingRequire(this, path);
		};
	} else {
		this.config.resolve = this.config.resolve ? this.config.resolve : require('browser-resolve').sync;
	}

	if (!Injector.defaultInstance) {
		Injector.defaultInstance = this;
	}
	if (!defaultInstance) {
		defaultInstance = this;
	}
}

Injector.prototype = _.create(EventEmitter.prototype, {
	cleanup: function() {
		Module.prototype.require = this.oldRequire;
		//this.sortedDirs.splice(0);
		this.dirTree = new DirTree();
		// var self = this;
		// _.each(_.keys(self.injectionScopeMap), function(key) {
		// 	delete self.injectionScopeMap[key];
		// });
		this.config = {};
		if (defaultInstance === this) {
			defaultInstance = null;
		}
		if (this.config.debug)
			log.debug('cleanup');
	},

	fromPackage: function(packageName, resolveOpts) {
		if (_.isArray(packageName)) {
			var args = [].slice.call(arguments);
			var factoryMaps = _.map(packageName, single => {
				args[0] = single;
				return this._fromPackage.apply(this, args);
			});
			return new FactoryMapCollection(factoryMaps);
		} else {
			return this._fromPackage.apply(this, arguments);
		}
	},

	_fromPackage: function(packageName, resolveOpts) {
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
			jsonPath = mothership(mainJsPath, function(json) {
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
	},

	fromDir: function(dir) {
		if (_.isArray(dir)) {
			var args = [].slice.call(arguments);
			var factoryMaps = _.map(dir, single => {
				args[0] = single;
				return this.resolveFromDir.apply(this, args);
			});
			return new FactoryMapCollection(factoryMaps);
		} else {
			return this.resolveFromDir.apply(this, arguments);
		}
	},

	resolveFromDir: function(dir) {
		var path = this.config.basedir ?
			Path.resolve(this.config.basedir, dir) : Path.resolve(dir);
		return this._fromDir(path, this.dirTree);
	},

	/**
	 * Recursively build dirTree, subDirMap
	 * @param  {string} path new directory
	 * @param  {Array<string>} dirs [description]
	 * @return {[type]}      [description]
	 */
	_fromDir: function(path, tree) {
		var factory;
		var linked = parseSymlink(path);
		if (linked !== path) {
			log.debug('%s is symbolic link path to %s', path, linked);
			factory = this._createFactoryMapFor(linked, tree);
		}
		return this._createFactoryMapFor(path, tree, factory);
	},

	_createFactoryMapFor: function(path, tree, existingFactory) {
		//path = this._pathToSortKey(path);
		if (!existingFactory) {
			var f = tree.getData(path);
			if (f) {
				return f;
			} else {
				f = new FactoryMap();
				tree.putData(path, f);
				return f;
			}
		} else {
			tree.putData(path, existingFactory);
			return existingFactory;
		}
	},

	/**
	 * Return array of configured FactoryMap for source code file depends on the file's location.
	 * Later on, you can call `factoryMap.matchRequire(name)` to get exact inject value
	 * @return {FactoryMap[]} Empty array if there is no injector configured for current file
	 */
	factoryMapsForFile: function(fromFile) {
		var fmaps = this.dirTree.getAllData(fromFile);
		return _.reverse(fmaps);
	},

	inject: function(calleeModule, name) {
		//var dir = this.quickSearchDirByFile(calleeModule.id);
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
	},

	replacingRequire: function(calleeModule, path) {
		try {
			return this.inject(calleeModule, path);
		} catch (e) {
			if (this.config.debug)
				log.debug('require from : ', calleeModule.id, e.message);
			throw e;
		}
	},

	testable: function() {
		return this;
	}
});

/**
 * If a path contains symbolic link, return the exact real path
 * Unlike fs.realpath, it also works for nonexist path
 * @return {[type]} [description]
 */
function parseSymlink(path) {
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

function emptryChainableFunction() {
	return emptyFactoryMap;
}
