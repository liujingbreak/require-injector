"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Module = require("module");
const _ = require("lodash");
var resolve = require('resolve').sync;
var mothership = require('mothership').sync;
const EventEmitter = require("events");
var Path = require('path');
const dir_tree_1 = require("./dir-tree");
var log = require('@log4js-node/log4js-api').getLogger('require-injector.node-inject');
var fs = require('fs');
const factory_map_1 = require("./factory-map");
exports.FactoryMap = factory_map_1.FactoryMap;
exports.FactoryMapCollection = factory_map_1.FactoryMapCollection;
module.exports.parseSymlink = parseSymlink;
var emptyFactoryMap = {
    factory: emptryChainableFunction,
    substitute: emptryChainableFunction,
    alias: emptryChainableFunction,
    replaceCode: emptryChainableFunction,
    value: emptryChainableFunction
};
class Injector extends EventEmitter {
    constructor(opts) {
        super();
        // this.sortedDirs = [];
        this.dirTree = new dir_tree_1.DirTree();
        // this.injectionScopeMap = {};
        this.oldRequire = Module.prototype.require;
        this._initOption(opts);
    }
    cleanup() {
        Module.prototype.require = this.oldRequire;
        // this.sortedDirs.splice(0);
        this.dirTree = new dir_tree_1.DirTree();
        // var self = this;
        // _.each(_.keys(self.injectionScopeMap), function(key) {
        // 	delete self.injectionScopeMap[key];
        // });
        this.config = {};
        if (this.config.debug)
            log.debug('cleanup');
    }
    fromPackage(packageName, resolveOpts) {
        if (Array.isArray(packageName)) {
            var args = [].slice.call(arguments);
            var factoryMaps = _.map(packageName, single => {
                args[0] = single;
                return this._fromPackage.apply(this, args);
            });
            return new factory_map_1.FactoryMapCollection(factoryMaps);
        }
        else {
            return this._fromPackage(packageName, resolveOpts);
        }
    }
    _fromPackage(packageName, resolveOpts) {
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
            jsonPath = mothership(mainJsPath, function (json) {
                return json.name === packageName;
            }).path;
        }
        catch (e) {
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
    fromDir(dir) {
        if (_.isArray(dir)) {
            var args = [].slice.call(arguments);
            var factoryMaps = _.map(dir, single => {
                args[0] = single;
                return this.resolveFromDir.apply(this, args);
            });
            return new factory_map_1.FactoryMapCollection(factoryMaps);
        }
        else {
            return this.resolveFromDir(dir);
        }
    }
    resolveFromDir(dir) {
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
    _fromDir(path, tree) {
        var factory;
        var linked = parseSymlink(path);
        if (linked !== path) {
            log.debug('%s is symbolic link path to %s', path, linked);
            factory = this._createFactoryMapFor(linked, tree);
        }
        return this._createFactoryMapFor(path, tree, factory);
    }
    _createFactoryMapFor(path, tree, existingFactory) {
        // path = this._pathToSortKey(path);
        if (!existingFactory) {
            var f = tree.getData(path);
            if (f) {
                return f;
            }
            else {
                f = new factory_map_1.FactoryMap(this.config);
                tree.putData(path, f);
                return f;
            }
        }
        else {
            tree.putData(path, existingFactory);
            return existingFactory;
        }
    }
    /**
     * Return array of configured FactoryMap for source code file depends on the file's location.
     * Later on, you can call `factoryMap.matchRequire(name)` to get exact inject value
     * @return {FactoryMap[]} Empty array if there is no injector configured for current file
     */
    factoryMapsForFile(fromFile) {
        var fmaps = this.dirTree.getAllData(fromFile);
        return _.reverse(fmaps);
    }
    testable() {
        return this;
    }
    _initOption(opts) {
        this.config = opts ? opts : {};
        var self = this;
        if (!_.get(opts, 'noNode')) {
            Module.prototype.require = function (path) {
                return self.replacingRequire(this, path);
            };
        }
        else {
            this.config.resolve = this.config.resolve ? this.config.resolve : require('browser-resolve').sync;
        }
    }
    inject(calleeModule, name) {
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
    replacingRequire(calleeModule, path) {
        try {
            return this.inject(calleeModule, path);
        }
        catch (e) {
            if (this.config.debug)
                log.debug('require from : ', calleeModule.id, e.message);
            throw e;
        }
    }
}
exports.default = Injector;
exports.NodeInjector = Injector;
/**
 * If a path contains symbolic link, return the exact real path
 * Unlike fs.realpath, it also works for nonexist path
 * @return {[type]} [description]
 */
function parseSymlink(path) {
    try {
        fs.accessSync(path, fs.F_OK);
        return fs.realpathSync(path);
    }
    catch (e) { }
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
        }
        catch (e) {
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
exports.parseSymlink = parseSymlink;
function emptryChainableFunction(name, RegExp) {
    return emptyFactoryMap;
}
//# sourceMappingURL=node-inject.js.map