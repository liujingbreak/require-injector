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
    fromRoot() {
        return this._fromDir('', this.dirTree);
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