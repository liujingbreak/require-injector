var Module = require('module');
var _ = require('lodash');
var resolve = require('resolve').sync;
var mothership = require('mothership').sync;
var Path = require('path');
var log = require('log4js').getLogger('require-injector.register-node');

var oldRequire = Module.prototype.require;

var sortedDirs = [];
var config;

var injectionScopeMap = {}; // key is directory, value is FactoryMap

module.exports = function(opts) {
	Module.prototype.require = replacingRequire;
	config = opts ? opts : {};
	return module.exports;
};

module.exports.quickSearchDirByFile = quickSearchDirByFile;
module.exports.injectionScopeMap = injectionScopeMap;
module.exports.cleanup = function() {
	Module.prototype.require = oldRequire;
	sortedDirs.splice(0);
	_.each(_.keys(injectionScopeMap), function(key) {
		delete injectionScopeMap[key];
	});
	config = {};
};

module.exports.testable = function() {
	return {
		quickSearchDirByFile: quickSearchDirByFile,
		sortedDirs: sortedDirs,
		//subDirMap: subDirMap,
		findDirIndexOfFile: findDirIndexOfFile,
		injectionScopeMap: injectionScopeMap
	};
};

/**
 * @param  {string | array} packageName
 * @param  {[type]} resolveOpts [description]
 * @return {[type]}             [description]
 */
module.exports.fromPackage = function(packageName, resolveFn, resolveOpts) {
	if (_.isArray(packageName)) {
		var args = [].slice.call(arguments);
		var factoryMaps = _.map(packageName, single => {
			args[0] = single;
			return fromPackage.apply(this, args);
		});
		return new FactoryMapCollection(factoryMaps);
	} else {
		return fromPackage.apply(this, arguments);
	}
};

function fromPackage(packageName, resolveOpts) {
	var resolveSync = resolve;
	if (config.resolve) {
		resolveSync = config.resolve;
	}

	if (_.isFunction(resolveOpts)) {
		resolveSync = resolveOpts;
		resolveOpts = arguments[2];
	}

	if (!resolveOpts) {
		resolveOpts = config.resolveOpts;
	}

	var mainJsPath = resolveSync(packageName, resolveOpts);
	var jsonPath = mothership(mainJsPath, function(json) {
		return json.name === packageName;
	}).path;
	if (jsonPath == null) {
		throw new Error(packageName + ' is not Found');
	}
	var path = Path.dirname(jsonPath);
	return _fromDir(path, sortedDirs);
}

module.exports.fromDir = function(dir) {
	if (_.isArray(dir)) {
		var args = [].slice.call(arguments);
		var factoryMaps = _.map(dir, single => {
			args[0] = single;
			return fromDir.apply(this, args);
		});
		return new FactoryMapCollection(factoryMaps);
	} else {
		return fromDir.apply(this, arguments);
	}
};

function fromDir(dir) {
	var path = config.basedir ?
		Path.resolve(config.basedir, dir) : Path.resolve(dir);
	return _fromDir(path, sortedDirs);
}

/**
 * Recursively build sortedDirs, subDirMap
 * @param  {[type]} path [description]
 * @param  {[type]} dirs [description]
 * @return {[type]}      [description]
 */
function _fromDir(path, dirs) {
	if (Path.sep === '\\') {
		path = path.replace(/\\/g, '/');
	}
	var idx = _.sortedIndex(dirs, path);
	if (dirs[idx] !== path) {
		if (idx > 0 && _.startsWith(path, dirs[idx - 1] + '/')) {
			// path is sub directory of dirs[idx-1]
			var parentDir = dirs[idx - 1];
			throw new Error('Overlap directory setting with ' + parentDir);
		} else if (dirs[idx] && _.startsWith(dirs[idx], path + '/')) {
			// path is parent dir of dirs[idx]
			throw new Error('Overlap directory setting with ' + dirs[idx]);
		}
		// Not found existing, insert it into sorted list
		dirs.splice(idx, 0, path);
		injectionScopeMap[path] = new FactoryMap();
	}
	return injectionScopeMap[path];
}


function FactoryMap() {
	this.requireMap = {};
}
FactoryMap.prototype = {
	factory: function(name, factory) {
		this.requireMap[name] = {factory: factory};
		return this;
	},
	substitute: function(name, anotherName) {
		this.requireMap[name] = {substitute: anotherName};
		return this;
	},
	value: function(name, value) {
		this.requireMap[name] = {value: value};
		return this;
	},
	getInjector: function(name) {
		if (_.has(this.requireMap, name)) {
			return this.requireMap[name];
		}
		return null;
	}
};

function FactoryMapCollection(factoryMaps) {
	this.maps = factoryMaps;
}
FactoryMapCollection.prototype = {
	factory: function() {
		this.maps.forEach(factoryMap => {
			factoryMap.factory.apply(factoryMap, arguments);
		});
		return this;
	},
	substitute: function(name, anotherName) {
		this.maps.forEach(factoryMap => {
			factoryMap.substitute.apply(factoryMap, arguments);
		});
		return this;
	},
	value: function(name, value) {
		this.maps.forEach(factoryMap => {
			factoryMap.value.apply(factoryMap, arguments);
		});
		return this;
	}
};

var packageNamePattern = /^[^\.\/\\][^:]+/;

function replacingRequire(path) {
	if (packageNamePattern.test(path)) {
		return inject(this, path);
	} else {
		return oldRequire.apply(this, arguments);
	}
}

function inject(calleeModule, name) {
	//var dir = quickSearchDirByFile(config.basedir ? Path.relative(config.basedir, calleeModule.id) : calleeModule.id);
	var dir = quickSearchDirByFile(calleeModule.id);
	if (dir) {
		var factoryMap = injectionScopeMap[dir];
		var injector = factoryMap.getInjector(name);
		if (injector) {
			if (config.debug) {
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
				return oldRequire.call(calleeModule, injector.substitute);
			} else if (_.has(injector, 'variable')) {
				return injector.variable;
			}
		}
	}
	return oldRequire.call(calleeModule, name);
}

function quickSearchDirByFile(file) {
	if (Path.sep === '\\') {
		file = file.replace(/\\/g, '/');
	}
	var idx = findDirIndexOfFile(file, sortedDirs);
	if (idx !== -1) {
		return sortedDirs[idx];
	}
	return null;
}


/**
 * Return -1, if file does not belong to any of directories `folders`
 * @param folders sorted directory path list
 */
function findDirIndexOfFile(file, folders) {
	var idx = _.sortedIndex(folders, file);
	if (idx === 0) {
		return -1;
	}
	if (!_.startsWith(file, folders[idx - 1] + '/')) {
		// file is not under any of folders
		return -1;
	}
	return idx - 1;
}
