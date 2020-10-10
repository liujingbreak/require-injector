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
        // var dir = this.quickSearchDirByFile(calleeModule.filename);
        var fmaps = this.factoryMapsForFile(calleeModule.filename);
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
            injected = factoryMap.getInjected(injector, calleeModule.filename, calleeModule, this.oldRequire);
            this.emit('inject', calleeModule.filename);
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
                log.debug('require from : ', calleeModule.filename, e.message);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1pbmplY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9ub2RlLWluamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsaUNBQWtDO0FBQ2xDLGtEQUE2QjtBQUM3QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3hDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDOUMsNERBQWtDO0FBQ2xDLHdEQUF3QjtBQUN4QiwrQ0FBeUI7QUFDekIseUNBQW1DO0FBQ25DLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBR3ZGLCtDQUE4RjtBQUN0RiwyRkFEQSx3QkFBVSxPQUNBO0FBQW9CLHFHQURBLGtDQUFvQixPQUNBO0FBQzFELE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztBQUczQyxJQUFJLGVBQWUsR0FBRztJQUNwQixPQUFPLEVBQUUsdUJBQXVCO0lBQ2hDLFVBQVUsRUFBRSx1QkFBdUI7SUFDbkMsS0FBSyxFQUFFLHVCQUF1QjtJQUM5QixXQUFXLEVBQUUsdUJBQXVCO0lBQ3BDLEtBQUssRUFBRyx1QkFBdUI7Q0FDWixDQUFDO0FBd0J0QixNQUFNLFFBQVMsU0FBUSxnQkFBWSxDQUFDLFlBQVk7SUFNOUMsWUFBWSxJQUFxQjtRQUMvQixLQUFLLEVBQUUsQ0FBQztRQUNSLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksa0JBQU8sRUFBRSxDQUFDO1FBQzdCLCtCQUErQjtRQUMvQixJQUFJLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO1FBQzNDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVELE9BQU87UUFD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QUFDYixDQUFDO0FBM0JELG9DQTJCQztBQUVELFNBQVMsdUJBQXVCLENBQUMsSUFBcUIsRUFBRSxNQUEyQjtJQUNqRixPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1vZHVsZSA9IHJlcXVpcmUoJ21vZHVsZScpO1xuaW1wb3J0ICogYXMgIF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IHJlc29sdmUgPSByZXF1aXJlKCdyZXNvbHZlJykuc3luYztcbmNvbnN0IG1vdGhlcnNoaXAgPSByZXF1aXJlKCdtb3RoZXJzaGlwJykuc3luYztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnZXZlbnRzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICcuL2Rpci10cmVlJztcbnZhciBsb2cgPSByZXF1aXJlKCdAbG9nNGpzLW5vZGUvbG9nNGpzLWFwaScpLmdldExvZ2dlcigncmVxdWlyZS1pbmplY3Rvci5ub2RlLWluamVjdCcpO1xuXG5cbmltcG9ydCB7RmFjdG9yeU1hcCwgRmFjdG9yeU1hcEludGVyZiwgRmFjdG9yeU1hcENvbGxlY3Rpb24sIEZhY3RvcnlGdW5jfSBmcm9tICcuL2ZhY3RvcnktbWFwJztcbmV4cG9ydCB7RmFjdG9yeU1hcCwgRmFjdG9yeU1hcEludGVyZiwgRmFjdG9yeU1hcENvbGxlY3Rpb259O1xubW9kdWxlLmV4cG9ydHMucGFyc2VTeW1saW5rID0gcGFyc2VTeW1saW5rO1xuXG5cbnZhciBlbXB0eUZhY3RvcnlNYXAgPSB7XG4gIGZhY3Rvcnk6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBzdWJzdGl0dXRlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgYWxpYXM6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICByZXBsYWNlQ29kZTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHZhbHVlOiAgZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb25cbn0gYXMgRmFjdG9yeU1hcEludGVyZjtcblxuZXhwb3J0IGludGVyZmFjZSBJbmplY3Rvck9wdGlvbiB7XG4gIC8qKlxuXHQgKiBkZWZhdWx0IGlzIHByb2Nlc3MuY3dkKCksIHVzZWQgdG8gcmVzb2x2ZSByZWxhdGl2ZSBwYXRoIGluIGAuZnJvbURpcihwYXRoKWBcblx0ICovXG4gIGJhc2VkaXI/OiBzdHJpbmc7XG4gIC8qKlxuXHQgKiBkZWZhdWx0IGlzIGZhbHNlLCBpZiB5b3Ugb25seSB1c2UgdGhpcyBtb2R1bGUgYXMgQnJvd3NlcmlmeSBvciBXZWJwYWNrJ3MgdHJhbnNmb3JtLFxuXHQgKiB5b3UgZG9uJ3Qgd2FudCBpbmplY3Rpb24gd29yayBvbiBOb2RlIHNpZGUsIG5vIGtpZG5hcHBpbmcgb24gYE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZWAsXG5cdCAqIHNldCB0aGlzIHByb3BlcnR5IHRvIGB0cnVlYFxuXHQgKi9cbiAgbm9Ob2RlPzogYm9vbGVhbjtcbiAgcmVzb2x2ZT86IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZztcbiAgcmVzb2x2ZU9wdHM/OiBhbnk7XG4gIGRlYnVnPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBicm93c2VyLXJlc29sdmUgb3B0aW9uc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmVPcHRpb24ge1xuICBiYXNlZGlyPzogc3RyaW5nO1xufVxuY2xhc3MgSW5qZWN0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyIHtcblxuICBkaXJUcmVlOiBEaXJUcmVlPEZhY3RvcnlNYXA+O1xuICBvbGRSZXF1aXJlOiBOb2RlSlMuUmVxdWlyZTtcbiAgY29uZmlnOiBJbmplY3Rvck9wdGlvbjtcblxuICBjb25zdHJ1Y3RvcihvcHRzPzogSW5qZWN0b3JPcHRpb24pIHtcbiAgICBzdXBlcigpO1xuICAgIC8vIHRoaXMuc29ydGVkRGlycyA9IFtdO1xuICAgIHRoaXMuZGlyVHJlZSA9IG5ldyBEaXJUcmVlKCk7XG4gICAgLy8gdGhpcy5pbmplY3Rpb25TY29wZU1hcCA9IHt9O1xuICAgIHRoaXMub2xkUmVxdWlyZSA9IE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZTtcbiAgICB0aGlzLl9pbml0T3B0aW9uKG9wdHMpO1xuICB9XG5cbiAgY2xlYW51cCgpIHtcbiAgICBNb2R1bGUucHJvdG90eXBlLnJlcXVpcmUgPSB0aGlzLm9sZFJlcXVpcmU7XG4gICAgLy8gdGhpcy5zb3J0ZWREaXJzLnNwbGljZSgwKTtcbiAgICB0aGlzLmRpclRyZWUgPSBuZXcgRGlyVHJlZSgpO1xuICAgIC8vIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBfLmVhY2goXy5rZXlzKHNlbGYuaW5qZWN0aW9uU2NvcGVNYXApLCBmdW5jdGlvbihrZXkpIHtcbiAgICAvLyBcdGRlbGV0ZSBzZWxmLmluamVjdGlvblNjb3BlTWFwW2tleV07XG4gICAgLy8gfSk7XG4gICAgdGhpcy5jb25maWcgPSB7fTtcbiAgICBpZiAodGhpcy5jb25maWcuZGVidWcpXG4gICAgICBsb2cuZGVidWcoJ2NsZWFudXAnKTtcbiAgfVxuXG4gIGZyb21QYWNrYWdlKHBhY2thZ2VOYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgcmVzb2x2ZU9wdHM/OiBSZXNvbHZlT3B0aW9uKTogRmFjdG9yeU1hcEludGVyZiB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocGFja2FnZU5hbWUpKSB7XG4gICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIHZhciBmYWN0b3J5TWFwcyA9IF8ubWFwKHBhY2thZ2VOYW1lIGFzIHN0cmluZ1tdLCBzaW5nbGUgPT4ge1xuICAgICAgICBhcmdzWzBdID0gc2luZ2xlO1xuICAgICAgICByZXR1cm4gdGhpcy5fZnJvbVBhY2thZ2UuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuZXcgRmFjdG9yeU1hcENvbGxlY3Rpb24oZmFjdG9yeU1hcHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fZnJvbVBhY2thZ2UocGFja2FnZU5hbWUsIHJlc29sdmVPcHRzKTtcbiAgICB9XG4gIH1cblxuICBfZnJvbVBhY2thZ2UocGFja2FnZU5hbWU6IHN0cmluZywgcmVzb2x2ZU9wdHM/OiBSZXNvbHZlT3B0aW9uKTogRmFjdG9yeU1hcEludGVyZiB7XG4gICAgdmFyIHJlc29sdmVTeW5jID0gcmVzb2x2ZTtcbiAgICBpZiAodGhpcy5jb25maWcucmVzb2x2ZSkge1xuICAgICAgcmVzb2x2ZVN5bmMgPSB0aGlzLmNvbmZpZy5yZXNvbHZlO1xuICAgIH1cblxuICAgIC8vIGlmIChfLmlzRnVuY3Rpb24ocmVzb2x2ZU9wdHMpKSB7XG4gICAgLy8gICByZXNvbHZlU3luYyA9IHJlc29sdmVPcHRzO1xuICAgIC8vICAgcmVzb2x2ZU9wdHMgPSBhcmd1bWVudHNbMl07XG4gICAgLy8gfVxuXG4gICAgaWYgKCFyZXNvbHZlT3B0cykge1xuICAgICAgcmVzb2x2ZU9wdHMgPSB0aGlzLmNvbmZpZy5yZXNvbHZlT3B0cztcbiAgICB9XG4gICAgdmFyIG1haW5Kc1BhdGgsIGpzb25QYXRoO1xuICAgIHRyeSB7XG4gICAgICBtYWluSnNQYXRoID0gcmVzb2x2ZVN5bmMocGFja2FnZU5hbWUsIHJlc29sdmVPcHRzKTtcbiAgICAgIGpzb25QYXRoID0gbW90aGVyc2hpcChtYWluSnNQYXRoLCBmdW5jdGlvbihqc29uOiB7W2s6IHN0cmluZ106IGFueX0pIHtcbiAgICAgICAgcmV0dXJuIGpzb24ubmFtZSA9PT0gcGFja2FnZU5hbWU7XG4gICAgICB9KS5wYXRoO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgPT09ICdNT0RVTEVfTk9UX0ZPVU5EJykge1xuICAgICAgICBsb2cuaW5mbyhwYWNrYWdlTmFtZSArICcgaXMgbm90IEZvdW5kLCB3aWxsIGJlIHNraXBwZWQgZnJvbSAuZnJvbVBhY2thZ2UoKScpO1xuICAgICAgICByZXR1cm4gZW1wdHlGYWN0b3J5TWFwO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gICAgaWYgKGpzb25QYXRoID09IG51bGwpIHtcbiAgICAgIGxvZy5pbmZvKHBhY2thZ2VOYW1lICsgJyBpcyBub3QgRm91bmQsIHdpbGwgYmUgc2tpcHBlZCBmcm9tIC5mcm9tUGFja2FnZSgpJyk7XG4gICAgICByZXR1cm4gZW1wdHlGYWN0b3J5TWFwO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9IFBhdGguZGlybmFtZShqc29uUGF0aCk7XG4gICAgcmV0dXJuIHRoaXMuX2Zyb21EaXIocGF0aCwgdGhpcy5kaXJUcmVlKTtcbiAgfVxuXG4gIGZyb21Sb290KCk6IEZhY3RvcnlNYXBJbnRlcmYge1xuICAgIHJldHVybiB0aGlzLl9mcm9tRGlyKCcnLCB0aGlzLmRpclRyZWUpO1xuICB9XG5cbiAgZnJvbURpcihkaXI6IHN0cmluZyB8IHN0cmluZ1tdKTogRmFjdG9yeU1hcEludGVyZiB7XG4gICAgaWYgKF8uaXNBcnJheShkaXIpKSB7XG4gICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIHZhciBmYWN0b3J5TWFwcyA9IF8ubWFwKGRpciwgc2luZ2xlID0+IHtcbiAgICAgICAgYXJnc1swXSA9IHNpbmdsZTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUZyb21EaXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuZXcgRmFjdG9yeU1hcENvbGxlY3Rpb24oZmFjdG9yeU1hcHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlRnJvbURpcihkaXIpO1xuICAgIH1cbiAgfVxuXG4gIHJlc29sdmVGcm9tRGlyKGRpcjogc3RyaW5nKTogRmFjdG9yeU1hcEludGVyZiB7XG4gICAgdmFyIHBhdGggPSB0aGlzLmNvbmZpZy5iYXNlZGlyID9cbiAgICAgIFBhdGgucmVzb2x2ZSh0aGlzLmNvbmZpZy5iYXNlZGlyLCBkaXIpIDogUGF0aC5yZXNvbHZlKGRpcik7XG4gICAgcmV0dXJuIHRoaXMuX2Zyb21EaXIocGF0aCwgdGhpcy5kaXJUcmVlKTtcbiAgfVxuXG4gIC8qKlxuXHQgKiBSZWN1cnNpdmVseSBidWlsZCBkaXJUcmVlLCBzdWJEaXJNYXBcblx0ICogQHBhcmFtICB7c3RyaW5nfSBwYXRoIG5ldyBkaXJlY3Rvcnlcblx0ICogQHBhcmFtICB7QXJyYXk8c3RyaW5nPn0gZGlycyBbZGVzY3JpcHRpb25dXG5cdCAqIEByZXR1cm4ge1t0eXBlXX0gICAgICBbZGVzY3JpcHRpb25dXG5cdCAqL1xuICBfZnJvbURpcihwYXRoOiBzdHJpbmcsIHRyZWU6IERpclRyZWU8RmFjdG9yeU1hcD4pOiBGYWN0b3J5TWFwIHtcbiAgICB2YXIgZmFjdG9yeTogRmFjdG9yeU1hcCB8IHVuZGVmaW5lZDtcbiAgICB2YXIgbGlua2VkID0gcGFyc2VTeW1saW5rKHBhdGgpO1xuICAgIGlmIChsaW5rZWQgIT09IHBhdGgpIHtcbiAgICAgIGxvZy5kZWJ1ZygnJXMgaXMgc3ltYm9saWMgbGluayBwYXRoIHRvICVzJywgcGF0aCwgbGlua2VkKTtcbiAgICAgIGZhY3RvcnkgPSB0aGlzLl9jcmVhdGVGYWN0b3J5TWFwRm9yKGxpbmtlZCwgdHJlZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jcmVhdGVGYWN0b3J5TWFwRm9yKHBhdGgsIHRyZWUsIGZhY3RvcnkpO1xuICB9XG5cbiAgX2NyZWF0ZUZhY3RvcnlNYXBGb3IocGF0aCA9ICcnLCB0cmVlOiBEaXJUcmVlPEZhY3RvcnlNYXA+LCBleGlzdGluZ0ZhY3Rvcnk/OiBGYWN0b3J5TWFwKTogRmFjdG9yeU1hcCB7XG4gICAgLy8gcGF0aCA9IHRoaXMuX3BhdGhUb1NvcnRLZXkocGF0aCk7XG4gICAgaWYgKCFleGlzdGluZ0ZhY3RvcnkpIHtcbiAgICAgIHZhciBmID0gdHJlZS5nZXREYXRhKHBhdGgpO1xuICAgICAgaWYgKGYpIHtcbiAgICAgICAgcmV0dXJuIGY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmID0gbmV3IEZhY3RvcnlNYXAodGhpcy5jb25maWcpO1xuICAgICAgICB0cmVlLnB1dERhdGEocGF0aCwgZik7XG4gICAgICAgIHJldHVybiBmO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0cmVlLnB1dERhdGEocGF0aCwgZXhpc3RpbmdGYWN0b3J5KTtcbiAgICAgIHJldHVybiBleGlzdGluZ0ZhY3Rvcnk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG5cdCAqIFJldHVybiBhcnJheSBvZiBjb25maWd1cmVkIEZhY3RvcnlNYXAgZm9yIHNvdXJjZSBjb2RlIGZpbGUgZGVwZW5kcyBvbiB0aGUgZmlsZSdzIGxvY2F0aW9uLlxuXHQgKiBMYXRlciBvbiwgeW91IGNhbiBjYWxsIGBmYWN0b3J5TWFwLm1hdGNoUmVxdWlyZShuYW1lKWAgdG8gZ2V0IGV4YWN0IGluamVjdCB2YWx1ZVxuXHQgKiBAcmV0dXJuIHtGYWN0b3J5TWFwW119IEVtcHR5IGFycmF5IGlmIHRoZXJlIGlzIG5vIGluamVjdG9yIGNvbmZpZ3VyZWQgZm9yIGN1cnJlbnQgZmlsZVxuXHQgKi9cbiAgZmFjdG9yeU1hcHNGb3JGaWxlKGZyb21GaWxlOiBzdHJpbmcpOiBGYWN0b3J5TWFwW10ge1xuICAgIHZhciBmbWFwcyA9IHRoaXMuZGlyVHJlZS5nZXRBbGxEYXRhKGZyb21GaWxlKTtcbiAgICByZXR1cm4gXy5yZXZlcnNlKGZtYXBzKTtcbiAgfVxuXG4gIHRlc3RhYmxlKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHByb3RlY3RlZCBfaW5pdE9wdGlvbihvcHRzPzogSW5qZWN0b3JPcHRpb24pIHtcbiAgICB0aGlzLmNvbmZpZyA9IG9wdHMgPyBvcHRzIDoge307XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFfLmdldChvcHRzLCAnbm9Ob2RlJykpIHtcbiAgICAgIE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucmVwbGFjaW5nUmVxdWlyZSh0aGlzLCBwYXRoKTtcbiAgICAgIH0gYXMgTm9kZUpTLlJlcXVpcmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29uZmlnLnJlc29sdmUgPSB0aGlzLmNvbmZpZy5yZXNvbHZlID8gdGhpcy5jb25maWcucmVzb2x2ZSA6IHJlcXVpcmUoJ2Jyb3dzZXItcmVzb2x2ZScpLnN5bmM7XG4gICAgfVxuICB9XG4gIHByb3RlY3RlZCBpbmplY3QoY2FsbGVlTW9kdWxlOiBNb2R1bGUsIG5hbWU6IHN0cmluZykge1xuICAgIC8vIHZhciBkaXIgPSB0aGlzLnF1aWNrU2VhcmNoRGlyQnlGaWxlKGNhbGxlZU1vZHVsZS5maWxlbmFtZSk7XG4gICAgdmFyIGZtYXBzID0gdGhpcy5mYWN0b3J5TWFwc0ZvckZpbGUoY2FsbGVlTW9kdWxlLmZpbGVuYW1lKTtcbiAgICBpZiAoZm1hcHMubGVuZ3RoID09PSAwKVxuICAgICAgcmV0dXJuIHRoaXMub2xkUmVxdWlyZS5jYWxsKGNhbGxlZU1vZHVsZSwgbmFtZSk7XG4gICAgdmFyIGluamVjdGVkO1xuICAgIHZhciBtYXRjaCA9IF8uc29tZShmbWFwcywgZmFjdG9yeU1hcCA9PiB7XG4gICAgICB2YXIgaW5qZWN0b3IgPSBmYWN0b3J5TWFwLm1hdGNoUmVxdWlyZShuYW1lKTtcbiAgICAgIGlmIChpbmplY3RvciA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmNvbmZpZy5kZWJ1Zykge1xuICAgICAgICBsb2cuZGVidWcoJ2luamVjdCAlcycsIG5hbWUpO1xuICAgICAgfVxuICAgICAgaW5qZWN0ZWQgPSBmYWN0b3J5TWFwLmdldEluamVjdGVkKGluamVjdG9yLCBjYWxsZWVNb2R1bGUuZmlsZW5hbWUsIGNhbGxlZU1vZHVsZSwgdGhpcy5vbGRSZXF1aXJlKTtcbiAgICAgIHRoaXMuZW1pdCgnaW5qZWN0JywgY2FsbGVlTW9kdWxlLmZpbGVuYW1lKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmICghbWF0Y2gpXG4gICAgICByZXR1cm4gdGhpcy5vbGRSZXF1aXJlLmNhbGwoY2FsbGVlTW9kdWxlLCBuYW1lKTtcbiAgICByZXR1cm4gaW5qZWN0ZWQ7XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVwbGFjaW5nUmVxdWlyZShjYWxsZWVNb2R1bGU6IE1vZHVsZSwgcGF0aDogc3RyaW5nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB0aGlzLmluamVjdChjYWxsZWVNb2R1bGUsIHBhdGgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmICh0aGlzLmNvbmZpZy5kZWJ1ZylcbiAgICAgICAgbG9nLmRlYnVnKCdyZXF1aXJlIGZyb20gOiAnLCBjYWxsZWVNb2R1bGUuZmlsZW5hbWUsIGUubWVzc2FnZSk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQge0luamVjdG9yIGFzIGRlZmF1bHQsIEluamVjdG9yIGFzIE5vZGVJbmplY3Rvcn07XG5cbi8qKlxuICogSWYgYSBwYXRoIGNvbnRhaW5zIHN5bWJvbGljIGxpbmssIHJldHVybiB0aGUgZXhhY3QgcmVhbCBwYXRoXG4gKiBVbmxpa2UgZnMucmVhbHBhdGgsIGl0IGFsc28gd29ya3MgZm9yIG5vbmV4aXN0IHBhdGhcbiAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTeW1saW5rKHBhdGg6IHN0cmluZykge1xuICB0cnkge1xuICAgIGZzLmFjY2Vzc1N5bmMocGF0aCwgZnMuY29uc3RhbnRzLkZfT0spO1xuICAgIHJldHVybiBmcy5yZWFscGF0aFN5bmMocGF0aCk7XG4gIH0gY2F0Y2ggKGUpIHt9XG4gIHBhdGggPSBQYXRoLnJlc29sdmUocGF0aCk7XG4gIHZhciBwYXJzZWQgPSBQYXRoLnBhcnNlKHBhdGgpO1xuICB2YXIgZGlyID0gcGFyc2VkLnJvb3Q7XG4gIHZhciBwYXRoRWxlbWVudHMgPSBwYXRoLnNwbGl0KFBhdGguc2VwKS5zbGljZSgxKTtcbiAgcGF0aEVsZW1lbnRzLnNvbWUoKGVsLCBpbmRleCkgPT4ge1xuICAgIGlmICghXy5lbmRzV2l0aChkaXIsIFBhdGguc2VwKSlcbiAgICAgIGRpciArPSBQYXRoLnNlcDtcbiAgICBkaXIgKz0gZWw7XG4gICAgdHJ5IHtcbiAgICAgIGZzLmFjY2Vzc1N5bmMoZGlyLCBmcy5jb25zdGFudHMuRl9PSyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdmFyIHJlc3RQYXJ0ID0gcGF0aEVsZW1lbnRzLnNsaWNlKGluZGV4ICsgMSkuam9pbihQYXRoLnNlcCk7XG4gICAgICBkaXIgKz0gcmVzdFBhcnQubGVuZ3RoID4gMCA/IFBhdGguc2VwICsgcmVzdFBhcnQgOiByZXN0UGFydDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoZnMubHN0YXRTeW5jKGRpcikuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgdmFyIGxpbmsgPSBmcy5yZWFkbGlua1N5bmMoZGlyKTtcbiAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoZGlyKSwgbGluayk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiBkaXI7XG59XG5cbmZ1bmN0aW9uIGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uKG5hbWU6IHN0cmluZyB8IFJlZ0V4cCwgUmVnRXhwOiBzdHJpbmd8IEZhY3RvcnlGdW5jKTogRmFjdG9yeU1hcEludGVyZiB7XG4gIHJldHVybiBlbXB0eUZhY3RvcnlNYXA7XG59XG4iXX0=