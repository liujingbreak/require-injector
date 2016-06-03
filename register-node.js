var Module = require('module');
var _ = require('lodash');
var resolve = require('resolve').sync;
var mothership = require('mothership').sync;
var Path = require('path');

var oldRequire = Module.prototype.require;
//var sortedPackagePathList = [];

var sortedDirs = [];
// var subDirMap = {}; // key is dir, value is array of sortedDirs
var injectionSetting;

var injectionScopeMap = {}; // key is directory, value is FactoryMap

module.exports = function(config) {
	Module.prototype.require = replacingRequire;
	injectionSetting = config ? config : {};
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
	injectionSetting = {};
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

module.exports.fromPackage = function(package, resolveOpts) {
	var mainJsPath = resolve(package, resolveOpts);
	var jsonPath = mothership(mainJsPath, function(json) {
		return json.name === package;
	}).path;
	if (jsonPath == null) {
		throw new Error(package + ' is not Found');
	}
	var path = Path.dirname(jsonPath).replace(/\\/g, '/');
	return fromDir(path, sortedDirs);
};

module.exports.fromDir = function(dir) {
	var path = injectionSetting.basedir ?
		Path.resolve(injectionSetting.basedir, dir) : Path.resolve(dir);
	path = path.replace(/\\/g, '/');
	return fromDir(path, sortedDirs);
};

/**
 * Recursively build sortedDirs, subDirMap
 * @param  {[type]} path [description]
 * @param  {[type]} dirs [description]
 * @return {[type]}      [description]
 */
function fromDir(path, dirs) {
	var idx = _.sortedIndex(dirs, path);
	if (dirs[idx] !== path) {
		if (idx > 0 && _.startsWith(path, dirs[idx-1] + '/')) {
			// path is sub directory of dirs[idx-1]
			var parentDir = dirs[idx-1];
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
	},
	getInjector: function(name) {
		if (_.has(this.requireMap, name)) {
			return this.requireMap[name];
		}
		return null;
	}
};

var relativePathPattern = /^(?:\.\/|\.\.\/|[\/\\])/;

// function buildPackagePathNameMap(packages, resolveOpts) {
// 	_.each(packages, function(x, name) {
// 		var mainJsPath = resolve(name, resolveOpts);
// 		var jsonPath = mothership(mainJsPath, function(json) {
// 			return json.name === name;
// 		}).path;
// 		var path = Path.dirname(jsonPath).replace(/\\/g, '/');
// 		packagePath2Name[path] = name;
// 		sortedPackagePathList.push(path);
// 	});
// 	sortedPackagePathList.sort();
// }

function replacingRequire(path) {
	if (relativePathPattern.test(path)) {
		return oldRequire.apply(this, arguments);
	} else {
		return inject(this, path);
	}
}

function inject(calleeModule, name) {
	//var dir = quickSearchDirByFile(injectionSetting.basedir ? Path.relative(injectionSetting.basedir, calleeModule.id) : calleeModule.id);
	var dir = quickSearchDirByFile(calleeModule.id);
	if (dir) {
		var factoryMap = injectionScopeMap[dir];
		var injector = factoryMap.getInjector(name);
		if (_.has(injector, 'factory')) {
			if (_.isFunction(injector.factory)) {
				return injector.factory(calleeModule.id);
			} else {
				return injector.factory;
			}
		} else if (_.has(injector, 'value')) {
			return injector.value;
		}else if (_.has(injector, 'substitute')) {
			return oldRequire.call(calleeModule, injector.substitute);
		}
	}
	return oldRequire.call(calleeModule, name);
}

function quickSearchDirByFile(file) {
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
