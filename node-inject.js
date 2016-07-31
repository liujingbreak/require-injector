var Module = require('module');
var _ = require('lodash');
var resolve = require('resolve').sync;
var mothership = require('mothership').sync;
var Path = require('path');
var log = require('log4js').getLogger('require-injector.node-inject');
var fs = require('fs');

module.exports = Injector;
var defaultInstance;
module.exports.getInstance = function() {
	return defaultInstance;
};

module.exports.FactoryMap = FactoryMap;
/**
 * [Injector description]
 * @param {object} opts optional
 * @param {string} opts.basedir default is process.cwd(), used to resolve relative path in `.fromDir(path)`
 * @param {boolean} opts.noNode default is false, if you only use this module as Browserify or Webpack's transform, you don't want injection work on Node side, no kidnapping on `Module.prototype.require`, set this property to `true`
 */
function Injector(opts) {
	if (!(this instanceof Injector)) {
		return new Injector(opts);
	}
	this.sortedDirs = [];
	this.injectionScopeMap = {};
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

Injector.prototype = {
	cleanup: function() {
		Module.prototype.require = this.oldRequire;
		this.sortedDirs.splice(0);
		var self = this;
		_.each(_.keys(self.injectionScopeMap), function(key) {
			delete self.injectionScopeMap[key];
		});
		this.config = {};
		if (defaultInstance === this) {
			defaultInstance = null;
		}
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
		var mainJsPath = resolveSync(packageName, resolveOpts);
		var jsonPath = mothership(mainJsPath, function(json) {
			return json.name === packageName;
		}).path;
		if (jsonPath == null) {
			throw new Error(packageName + ' is not Found');
		}
		var path = Path.dirname(jsonPath);
		return this._fromDir(path, this.sortedDirs);
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
		return this._fromDir(path, this.sortedDirs);
	},

	/**
	 * Recursively build sortedDirs, subDirMap
	 * @param  {string} path new directory
	 * @param  {Array<string>} dirs [description]
	 * @return {[type]}      [description]
	 */
	_fromDir: function(path, dirs) {
		if (Path.sep === '\\') {
			path = path.replace(/\\/g, '/');
		}
		if (!_.endsWith(path, '/'))
			path += '/';
		var idx = _.sortedIndex(dirs, path);
		if (dirs[idx] !== path) {
			if (idx > 0 && _.startsWith(path, dirs[idx - 1])) {
				// path is sub directory of dirs[idx-1]
				var parentDir = dirs[idx - 1];
				throw new Error('Overlap directory setting with ' + parentDir);
			} else if (dirs[idx] && _.startsWith(dirs[idx], path)) {
				// path is parent dir of dirs[idx]
				throw new Error('Overlap directory setting with ' + dirs[idx]);
			}
			// Not found existing, insert it into sorted list
			dirs.splice(idx, 0, path);
			this.injectionScopeMap[path] = new FactoryMap();
		}
		return this.injectionScopeMap[path];
	},

	/**
	 * If a path contains symbolic link, return the exact real path
	 * @return {[type]} [description]
	 */
	parseSymbolicLinkPath: function(path) {
		path = Path.resolve(path);
		try {
			fs.accessSync(path, fs.F_OK);
		} catch (e) {
			log.debug(e);
		}
		var root = Path.parse(path).root;
		var dir = path;
		while (dir !== root) {
			fs.lstat(path).isSymbolicLink();
			dir = Path.dirname(path);
		}
		
	},

	/**
	 * Return configured FactoryMap for source code file depends on the file's location.
	 * Later on, you can call `factoryMap.getInjector(name)` to get exact inject value
	 * @return {FactoryMap | null} Null if there is no injector configured for current file
	 */
	factoryMapForFile: function(fromFile) {
		var dir = this.quickSearchDirByFile(fromFile);
		if (dir) {
			return this.injectionScopeMap[dir];
		}
		return null;
	},

	inject: function(calleeModule, name) {
		var dir = this.quickSearchDirByFile(calleeModule.id);
		if (dir == null)
			return this.oldRequire.call(calleeModule, name);
		var factoryMap = this.injectionScopeMap[dir];
		var injector = factoryMap.getInjector(name);
		if (injector == null)
			return this.oldRequire.call(calleeModule, name);
		if (this.config.debug) {
			log.debug('inject ' + name + ' to ' + dir);
		}
		if (_.has(injector, 'factory')) {
			if (_.isFunction(injector.factory)) {
				return injector.factory(calleeModule.id);
			} else {
				return injector.factory;
			}
		} else if (_.has(injector, 'value')) {
			if (_.has(injector.value, 'value')) {
				return injector.value.value;
			} else {
				return injector.value;
			}
		} else if (_.has(injector, 'substitute')) {
			return this.oldRequire.call(calleeModule, injector.substitute);
		} else if (_.has(injector, 'variable')) {
			return injector.variable;
		}
		return this.oldRequire.call(calleeModule, name);
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

	quickSearchDirByFile: function(file) {
		if (Path.sep === '\\') {
			file = file.replace(/\\/g, '/');
		}
		var idx = findDirIndexOfFile(file, this.sortedDirs);
		if (idx !== -1) {
			return this.sortedDirs[idx];
		}
		return null;
	},

	testable: function() {
		return this;
	}
};

function FactoryMap() {
	this.requireMap = {};
}
FactoryMap.prototype = {
	METHODS: ['factory', 'substitute', 'value', 'swigTemplateDir'], // you can extend with new method here

	getInjector: function(name) {
		if (_.has(this.requireMap, name)) {
			return this.requireMap[name];
		}
		return null;
	}
};

FactoryMap.prototype.METHODS.forEach(function(mName) {
	FactoryMap.prototype[mName] = function(name, value) {
		this.requireMap[name] = {};
		this.requireMap[name][mName] = value;
		return this;
	};
});

function FactoryMapCollection(factoryMaps) {
	this.maps = factoryMaps;
}

FactoryMap.prototype.METHODS.forEach(function(method) {
	FactoryMapCollection.prototype[method] = function() {
		this.maps.forEach(factoryMap => {
			factoryMap[method].apply(factoryMap, arguments);
		});
		return this;
	};
});

/**
 * Return -1, if file does not belong to any of directories `folders`
 * @param folders sorted directory path list
 */
function findDirIndexOfFile(file, folders) {
	var idx = _.sortedIndex(folders, file);
	if (idx === 0) {
		return -1;
	}
	if (!_.startsWith(file, folders[idx - 1])) {
		// file is not under any of folders
		return -1;
	}
	return idx - 1;
}