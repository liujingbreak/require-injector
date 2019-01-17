"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Module = require("module");
const _ = tslib_1.__importStar(require("lodash"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1pbmplY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9ub2RlLWluamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpQ0FBa0M7QUFDbEMsa0RBQTZCO0FBQzdCLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdEMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQztBQUM1Qyx1Q0FBd0M7QUFDeEMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLHlDQUFtQztBQUNuQyxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUN2RixJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdkIsK0NBQThGO0FBQ3RGLHFCQURBLHdCQUFVLENBQ0E7QUFBb0IsK0JBREEsa0NBQW9CLENBQ0E7QUFDMUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0FBRzNDLElBQUksZUFBZSxHQUFHO0lBQ3JCLE9BQU8sRUFBRSx1QkFBdUI7SUFDaEMsVUFBVSxFQUFFLHVCQUF1QjtJQUNuQyxLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLFdBQVcsRUFBRSx1QkFBdUI7SUFDcEMsS0FBSyxFQUFHLHVCQUF1QjtDQUNYLENBQUM7QUF3QnRCLE1BQU0sUUFBUyxTQUFRLFlBQVk7SUFNbEMsWUFBWSxJQUFxQjtRQUNoQyxLQUFLLEVBQUUsQ0FBQztRQUNSLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksa0JBQU8sRUFBRSxDQUFDO1FBQzdCLCtCQUErQjtRQUMvQixJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO1FBQzNDLElBQUks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