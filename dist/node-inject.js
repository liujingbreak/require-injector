"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSymlink = exports.NodeInjector = exports.default = exports.FactoryMapCollection = exports.FactoryMap = void 0;
const tslib_1 = require("tslib");
const Module = require("module");
const _ = tslib_1.__importStar(require("lodash"));
const resolve = require('resolve').sync;
const mothership = require('mothership').sync;
const events_1 = tslib_1.__importDefault(require("events"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const dir_tree_1 = require("./dir-tree");
var log = require('@log4js-node/log4js-api').getLogger('require-injector.node-inject');
const factory_map_1 = require("./factory-map");
Object.defineProperty(exports, "FactoryMap", { enumerable: true, get: function () { return factory_map_1.FactoryMap; } });
Object.defineProperty(exports, "FactoryMapCollection", { enumerable: true, get: function () { return factory_map_1.FactoryMapCollection; } });
module.exports.parseSymlink = parseSymlink;
var emptyFactoryMap = {
    factory: emptryChainableFunction,
    substitute: emptryChainableFunction,
    alias: emptryChainableFunction,
    replaceCode: emptryChainableFunction,
    value: emptryChainableFunction
};
class Injector extends events_1.default.EventEmitter {
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
        // if (_.isFunction(resolveOpts)) {
        //   resolveSync = resolveOpts;
        //   resolveOpts = arguments[2];
        // }
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
        var path = path_1.default.dirname(jsonPath);
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
            path_1.default.resolve(this.config.basedir, dir) : path_1.default.resolve(dir);
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
    _createFactoryMapFor(path = '', tree, existingFactory) {
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
        fs.accessSync(path, fs.constants.F_OK);
        return fs.realpathSync(path);
    }
    catch (e) { }
    path = path_1.default.resolve(path);
    var parsed = path_1.default.parse(path);
    var dir = parsed.root;
    var pathElements = path.split(path_1.default.sep).slice(1);
    pathElements.some((el, index) => {
        if (!_.endsWith(dir, path_1.default.sep))
            dir += path_1.default.sep;
        dir += el;
        try {
            fs.accessSync(dir, fs.constants.F_OK);
        }
        catch (e) {
            var restPart = pathElements.slice(index + 1).join(path_1.default.sep);
            dir += restPart.length > 0 ? path_1.default.sep + restPart : restPart;
            return true;
        }
        if (fs.lstatSync(dir).isSymbolicLink()) {
            var link = fs.readlinkSync(dir);
            dir = path_1.default.resolve(path_1.default.dirname(dir), link);
        }
        return false;
    });
    return dir;
}
exports.parseSymlink = parseSymlink;
function emptryChainableFunction(name, RegExp) {
    return emptyFactoryMap;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1pbmplY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9ub2RlLWluamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsaUNBQWtDO0FBQ2xDLGtEQUE2QjtBQUM3QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3hDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDOUMsNERBQWtDO0FBQ2xDLHdEQUF3QjtBQUN4QiwrQ0FBeUI7QUFDekIseUNBQW1DO0FBQ25DLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBR3ZGLCtDQUE4RjtBQUN0RiwyRkFEQSx3QkFBVSxPQUNBO0FBQW9CLHFHQURBLGtDQUFvQixPQUNBO0FBQzFELE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztBQUczQyxJQUFJLGVBQWUsR0FBRztJQUNwQixPQUFPLEVBQUUsdUJBQXVCO0lBQ2hDLFVBQVUsRUFBRSx1QkFBdUI7SUFDbkMsS0FBSyxFQUFFLHVCQUF1QjtJQUM5QixXQUFXLEVBQUUsdUJBQXVCO0lBQ3BDLEtBQUssRUFBRyx1QkFBdUI7Q0FDWixDQUFDO0FBd0J0QixNQUFNLFFBQVMsU0FBUSxnQkFBWSxDQUFDLFlBQVk7SUFNOUMsWUFBWSxJQUFxQjtRQUMvQixLQUFLLEVBQUUsQ0FBQztRQUNSLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksa0JBQU8sRUFBRSxDQUFDO1FBQzdCLCtCQUErQjtRQUMvQixJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO1FBQzNDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVELE9BQU87UUFD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