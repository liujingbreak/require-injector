"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSymlink = exports.NodeInjector = exports.default = exports.FactoryMapCollection = exports.FactoryMap = void 0;
const tslib_1 = require("tslib");
const Module = require("module");
const events_1 = tslib_1.__importDefault(require("events"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
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
            var factoryMaps = lodash_1.default.map(packageName, single => {
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
        // var resolveSync = resolve;
        if (!resolveOpts) {
            resolveOpts = this.config.resolveOpts;
        }
        let dir = (resolveOpts === null || resolveOpts === void 0 ? void 0 : resolveOpts.basedir) || process.cwd();
        const { root: rootDir } = path_1.default.parse(dir);
        let jsonPath;
        do {
            const testPkgJson = path_1.default.resolve(dir, 'node_modules', packageName, 'package.json');
            if (fs.existsSync(testPkgJson)) {
                jsonPath = testPkgJson;
                break;
            }
            else {
                dir = path_1.default.dirname(dir);
            }
        } while (dir !== rootDir);
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
        if (lodash_1.default.isArray(dir)) {
            var args = [].slice.call(arguments);
            var factoryMaps = lodash_1.default.map(dir, single => {
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
        return lodash_1.default.reverse(fmaps);
    }
    testable() {
        return this;
    }
    _initOption(opts) {
        this.config = opts ? opts : {};
        var self = this;
        if (!lodash_1.default.get(opts, 'noNode')) {
            Module.prototype.require = function (path) {
                return self.replacingRequire(this, path);
            };
        }
    }
    inject(calleeModule, name) {
        // var dir = this.quickSearchDirByFile(calleeModule.filename);
        var fmaps = this.factoryMapsForFile(calleeModule.filename);
        if (fmaps.length === 0)
            return this.oldRequire.call(calleeModule, name);
        var injected;
        var match = lodash_1.default.some(fmaps, factoryMap => {
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
        if (!lodash_1.default.endsWith(dir, path_1.default.sep))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1pbmplY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9ub2RlLWluamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsaUNBQWtDO0FBQ2xDLDREQUFrQztBQUNsQyx3REFBd0I7QUFDeEIsK0NBQXlCO0FBQ3pCLDREQUF1QjtBQUN2Qix5Q0FBbUM7QUFDbkMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFHdkYsK0NBQThGO0FBQ3RGLDJGQURBLHdCQUFVLE9BQ0E7QUFBb0IscUdBREEsa0NBQW9CLE9BQ0E7QUFDMUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0FBRzNDLElBQUksZUFBZSxHQUFHO0lBQ3BCLE9BQU8sRUFBRSx1QkFBdUI7SUFDaEMsVUFBVSxFQUFFLHVCQUF1QjtJQUNuQyxLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLFdBQVcsRUFBRSx1QkFBdUI7SUFDcEMsS0FBSyxFQUFHLHVCQUF1QjtDQUNaLENBQUM7QUF3QnRCLE1BQU0sUUFBUyxTQUFRLGdCQUFZLENBQUMsWUFBWTtJQU05QyxZQUFZLElBQXFCO1FBQy9CLEtBQUssRUFBRSxDQUFDO1FBQ1Isd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxrQkFBTyxFQUFFLENBQUM7UUFDN0IsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRUQsT0FBTztRQUNMLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDM0MsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxrQkFBTyxFQUFFLENBQUM7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LENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3ZDO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixJQUFJLFFBQVEsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVELEdBQUcsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUM1RCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO1lBQ3RDLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUM3QztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUEzQkQsb0NBMkJDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxJQUFxQixFQUFFLE1BQTJCO0lBQ2pGLE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTW9kdWxlID0gcmVxdWlyZSgnbW9kdWxlJyk7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJy4vZGlyLXRyZWUnO1xudmFyIGxvZyA9IHJlcXVpcmUoJ0Bsb2c0anMtbm9kZS9sb2c0anMtYXBpJykuZ2V0TG9nZ2VyKCdyZXF1aXJlLWluamVjdG9yLm5vZGUtaW5qZWN0Jyk7XG5cblxuaW1wb3J0IHtGYWN0b3J5TWFwLCBGYWN0b3J5TWFwSW50ZXJmLCBGYWN0b3J5TWFwQ29sbGVjdGlvbiwgRmFjdG9yeUZ1bmN9IGZyb20gJy4vZmFjdG9yeS1tYXAnO1xuZXhwb3J0IHtGYWN0b3J5TWFwLCBGYWN0b3J5TWFwSW50ZXJmLCBGYWN0b3J5TWFwQ29sbGVjdGlvbn07XG5tb2R1bGUuZXhwb3J0cy5wYXJzZVN5bWxpbmsgPSBwYXJzZVN5bWxpbms7XG5cblxudmFyIGVtcHR5RmFjdG9yeU1hcCA9IHtcbiAgZmFjdG9yeTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHN1YnN0aXR1dGU6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBhbGlhczogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHJlcGxhY2VDb2RlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgdmFsdWU6ICBlbXB0cnlDaGFpbmFibGVGdW5jdGlvblxufSBhcyBGYWN0b3J5TWFwSW50ZXJmO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluamVjdG9yT3B0aW9uIHtcbiAgLyoqXG5cdCAqIGRlZmF1bHQgaXMgcHJvY2Vzcy5jd2QoKSwgdXNlZCB0byByZXNvbHZlIHJlbGF0aXZlIHBhdGggaW4gYC5mcm9tRGlyKHBhdGgpYFxuXHQgKi9cbiAgYmFzZWRpcj86IHN0cmluZztcbiAgLyoqXG5cdCAqIGRlZmF1bHQgaXMgZmFsc2UsIGlmIHlvdSBvbmx5IHVzZSB0aGlzIG1vZHVsZSBhcyBCcm93c2VyaWZ5IG9yIFdlYnBhY2sncyB0cmFuc2Zvcm0sXG5cdCAqIHlvdSBkb24ndCB3YW50IGluamVjdGlvbiB3b3JrIG9uIE5vZGUgc2lkZSwgbm8ga2lkbmFwcGluZyBvbiBgTW9kdWxlLnByb3RvdHlwZS5yZXF1aXJlYCxcblx0ICogc2V0IHRoaXMgcHJvcGVydHkgdG8gYHRydWVgXG5cdCAqL1xuICBub05vZGU/OiBib29sZWFuO1xuICAvLyByZXNvbHZlPzogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nO1xuICByZXNvbHZlT3B0cz86IGFueTtcbiAgZGVidWc/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIGJyb3dzZXItcmVzb2x2ZSBvcHRpb25zXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZU9wdGlvbiB7XG4gIGJhc2VkaXI/OiBzdHJpbmc7XG59XG5jbGFzcyBJbmplY3RvciBleHRlbmRzIEV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIge1xuXG4gIGRpclRyZWU6IERpclRyZWU8RmFjdG9yeU1hcD47XG4gIG9sZFJlcXVpcmU6IE5vZGVKUy5SZXF1aXJlO1xuICBjb25maWc6IEluamVjdG9yT3B0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKG9wdHM/OiBJbmplY3Rvck9wdGlvbikge1xuICAgIHN1cGVyKCk7XG4gICAgLy8gdGhpcy5zb3J0ZWREaXJzID0gW107XG4gICAgdGhpcy5kaXJUcmVlID0gbmV3IERpclRyZWUoKTtcbiAgICAvLyB0aGlzLmluamVjdGlvblNjb3BlTWFwID0ge307XG4gICAgdGhpcy5vbGRSZXF1aXJlID0gTW9kdWxlLnByb3RvdHlwZS5yZXF1aXJlO1xuICAgIHRoaXMuX2luaXRPcHRpb24ob3B0cyk7XG4gIH1cblxuICBjbGVhbnVwKCkge1xuICAgIE1vZHVsZS5wcm90b3R5cGUucmVxdWlyZSA9IHRoaXMub2xkUmVxdWlyZTtcbiAgICAvLyB0aGlzLnNvcnRlZERpcnMuc3BsaWNlKDApO1xuICAgIHRoaXMuZGlyVHJlZSA9IG5ldyBEaXJUcmVlKCk7XG4gICAgLy8gdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIF8uZWFjaChfLmtleXMoc2VsZi5pbmplY3Rpb25TY29wZU1hcCksIGZ1bmN0aW9uKGtleSkge1xuICAgIC8vIFx0ZGVsZXRlIHNlbGYuaW5qZWN0aW9uU2NvcGVNYXBba2V5XTtcbiAgICAvLyB9KTtcbiAgICB0aGlzLmNvbmZpZyA9IHt9O1xuICAgIGlmICh0aGlzLmNvbmZpZy5kZWJ1ZylcbiAgICAgIGxvZy5kZWJ1ZygnY2xlYW51cCcpO1xuICB9XG5cbiAgZnJvbVBhY2thZ2UocGFja2FnZU5hbWU6IHN0cmluZyB8IHN0cmluZ1tdLCByZXNvbHZlT3B0cz86IFJlc29sdmVPcHRpb24pOiBGYWN0b3J5TWFwSW50ZXJmIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShwYWNrYWdlTmFtZSkpIHtcbiAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgdmFyIGZhY3RvcnlNYXBzID0gXy5tYXAocGFja2FnZU5hbWUgYXMgc3RyaW5nW10sIHNpbmdsZSA9PiB7XG4gICAgICAgIGFyZ3NbMF0gPSBzaW5nbGU7XG4gICAgICAgIHJldHVybiB0aGlzLl9mcm9tUGFja2FnZS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5ldyBGYWN0b3J5TWFwQ29sbGVjdGlvbihmYWN0b3J5TWFwcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLl9mcm9tUGFja2FnZShwYWNrYWdlTmFtZSwgcmVzb2x2ZU9wdHMpO1xuICAgIH1cbiAgfVxuXG4gIF9mcm9tUGFja2FnZShwYWNrYWdlTmFtZTogc3RyaW5nLCByZXNvbHZlT3B0cz86IFJlc29sdmVPcHRpb24pOiBGYWN0b3J5TWFwSW50ZXJmIHtcbiAgICAvLyB2YXIgcmVzb2x2ZVN5bmMgPSByZXNvbHZlO1xuICAgIGlmICghcmVzb2x2ZU9wdHMpIHtcbiAgICAgIHJlc29sdmVPcHRzID0gdGhpcy5jb25maWcucmVzb2x2ZU9wdHM7XG4gICAgfVxuICAgIGxldCBkaXIgPSByZXNvbHZlT3B0cz8uYmFzZWRpciB8fCBwcm9jZXNzLmN3ZCgpO1xuICAgIGNvbnN0IHtyb290OiByb290RGlyfSA9IFBhdGgucGFyc2UoZGlyKTtcbiAgICBsZXQganNvblBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBkbyB7XG4gICAgICBjb25zdCB0ZXN0UGtnSnNvbiA9IFBhdGgucmVzb2x2ZShkaXIsICdub2RlX21vZHVsZXMnLCBwYWNrYWdlTmFtZSwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdFBrZ0pzb24pKSB7XG4gICAgICAgIGpzb25QYXRoID0gdGVzdFBrZ0pzb247XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGlyID0gUGF0aC5kaXJuYW1lKGRpcik7XG4gICAgICB9XG4gICAgfSB3aGlsZSAoZGlyICE9PSByb290RGlyKTtcbiAgICBpZiAoanNvblBhdGggPT0gbnVsbCkge1xuICAgICAgbG9nLmluZm8ocGFja2FnZU5hbWUgKyAnIGlzIG5vdCBGb3VuZCwgd2lsbCBiZSBza2lwcGVkIGZyb20gLmZyb21QYWNrYWdlKCknKTtcbiAgICAgIHJldHVybiBlbXB0eUZhY3RvcnlNYXA7XG4gICAgfVxuICAgIHZhciBwYXRoID0gUGF0aC5kaXJuYW1lKGpzb25QYXRoKTtcbiAgICByZXR1cm4gdGhpcy5fZnJvbURpcihwYXRoLCB0aGlzLmRpclRyZWUpO1xuICB9XG5cbiAgZnJvbVJvb3QoKTogRmFjdG9yeU1hcEludGVyZiB7XG4gICAgcmV0dXJuIHRoaXMuX2Zyb21EaXIoJycsIHRoaXMuZGlyVHJlZSk7XG4gIH1cblxuICBmcm9tRGlyKGRpcjogc3RyaW5nIHwgc3RyaW5nW10pOiBGYWN0b3J5TWFwSW50ZXJmIHtcbiAgICBpZiAoXy5pc0FycmF5KGRpcikpIHtcbiAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgdmFyIGZhY3RvcnlNYXBzID0gXy5tYXAoZGlyLCBzaW5nbGUgPT4ge1xuICAgICAgICBhcmdzWzBdID0gc2luZ2xlO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlRnJvbURpci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5ldyBGYWN0b3J5TWFwQ29sbGVjdGlvbihmYWN0b3J5TWFwcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVGcm9tRGlyKGRpcik7XG4gICAgfVxuICB9XG5cbiAgcmVzb2x2ZUZyb21EaXIoZGlyOiBzdHJpbmcpOiBGYWN0b3J5TWFwSW50ZXJmIHtcbiAgICB2YXIgcGF0aCA9IHRoaXMuY29uZmlnLmJhc2VkaXIgP1xuICAgICAgUGF0aC5yZXNvbHZlKHRoaXMuY29uZmlnLmJhc2VkaXIsIGRpcikgOiBQYXRoLnJlc29sdmUoZGlyKTtcbiAgICByZXR1cm4gdGhpcy5fZnJvbURpcihwYXRoLCB0aGlzLmRpclRyZWUpO1xuICB9XG5cbiAgLyoqXG5cdCAqIFJlY3Vyc2l2ZWx5IGJ1aWxkIGRpclRyZWUsIHN1YkRpck1hcFxuXHQgKiBAcGFyYW0gIHtzdHJpbmd9IHBhdGggbmV3IGRpcmVjdG9yeVxuXHQgKiBAcGFyYW0gIHtBcnJheTxzdHJpbmc+fSBkaXJzIFtkZXNjcmlwdGlvbl1cblx0ICogQHJldHVybiB7W3R5cGVdfSAgICAgIFtkZXNjcmlwdGlvbl1cblx0ICovXG4gIF9mcm9tRGlyKHBhdGg6IHN0cmluZywgdHJlZTogRGlyVHJlZTxGYWN0b3J5TWFwPik6IEZhY3RvcnlNYXAge1xuICAgIHZhciBmYWN0b3J5OiBGYWN0b3J5TWFwIHwgdW5kZWZpbmVkO1xuICAgIHZhciBsaW5rZWQgPSBwYXJzZVN5bWxpbmsocGF0aCk7XG4gICAgaWYgKGxpbmtlZCAhPT0gcGF0aCkge1xuICAgICAgbG9nLmRlYnVnKCclcyBpcyBzeW1ib2xpYyBsaW5rIHBhdGggdG8gJXMnLCBwYXRoLCBsaW5rZWQpO1xuICAgICAgZmFjdG9yeSA9IHRoaXMuX2NyZWF0ZUZhY3RvcnlNYXBGb3IobGlua2VkLCB0cmVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2NyZWF0ZUZhY3RvcnlNYXBGb3IocGF0aCwgdHJlZSwgZmFjdG9yeSk7XG4gIH1cblxuICBfY3JlYXRlRmFjdG9yeU1hcEZvcihwYXRoID0gJycsIHRyZWU6IERpclRyZWU8RmFjdG9yeU1hcD4sIGV4aXN0aW5nRmFjdG9yeT86IEZhY3RvcnlNYXApOiBGYWN0b3J5TWFwIHtcbiAgICAvLyBwYXRoID0gdGhpcy5fcGF0aFRvU29ydEtleShwYXRoKTtcbiAgICBpZiAoIWV4aXN0aW5nRmFjdG9yeSkge1xuICAgICAgdmFyIGYgPSB0cmVlLmdldERhdGEocGF0aCk7XG4gICAgICBpZiAoZikge1xuICAgICAgICByZXR1cm4gZjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGYgPSBuZXcgRmFjdG9yeU1hcCh0aGlzLmNvbmZpZyk7XG4gICAgICAgIHRyZWUucHV0RGF0YShwYXRoLCBmKTtcbiAgICAgICAgcmV0dXJuIGY7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyZWUucHV0RGF0YShwYXRoLCBleGlzdGluZ0ZhY3RvcnkpO1xuICAgICAgcmV0dXJuIGV4aXN0aW5nRmFjdG9yeTtcbiAgICB9XG4gIH1cblxuICAvKipcblx0ICogUmV0dXJuIGFycmF5IG9mIGNvbmZpZ3VyZWQgRmFjdG9yeU1hcCBmb3Igc291cmNlIGNvZGUgZmlsZSBkZXBlbmRzIG9uIHRoZSBmaWxlJ3MgbG9jYXRpb24uXG5cdCAqIExhdGVyIG9uLCB5b3UgY2FuIGNhbGwgYGZhY3RvcnlNYXAubWF0Y2hSZXF1aXJlKG5hbWUpYCB0byBnZXQgZXhhY3QgaW5qZWN0IHZhbHVlXG5cdCAqIEByZXR1cm4ge0ZhY3RvcnlNYXBbXX0gRW1wdHkgYXJyYXkgaWYgdGhlcmUgaXMgbm8gaW5qZWN0b3IgY29uZmlndXJlZCBmb3IgY3VycmVudCBmaWxlXG5cdCAqL1xuICBmYWN0b3J5TWFwc0ZvckZpbGUoZnJvbUZpbGU6IHN0cmluZyk6IEZhY3RvcnlNYXBbXSB7XG4gICAgdmFyIGZtYXBzID0gdGhpcy5kaXJUcmVlLmdldEFsbERhdGEoZnJvbUZpbGUpO1xuICAgIHJldHVybiBfLnJldmVyc2UoZm1hcHMpO1xuICB9XG5cbiAgdGVzdGFibGUoKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgcHJvdGVjdGVkIF9pbml0T3B0aW9uKG9wdHM/OiBJbmplY3Rvck9wdGlvbikge1xuICAgIHRoaXMuY29uZmlnID0gb3B0cyA/IG9wdHMgOiB7fTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIV8uZ2V0KG9wdHMsICdub05vZGUnKSkge1xuICAgICAgTW9kdWxlLnByb3RvdHlwZS5yZXF1aXJlID0gZnVuY3Rpb24ocGF0aCkge1xuICAgICAgICByZXR1cm4gc2VsZi5yZXBsYWNpbmdSZXF1aXJlKHRoaXMsIHBhdGgpO1xuICAgICAgfSBhcyBOb2RlSlMuUmVxdWlyZTtcbiAgICB9XG4gIH1cbiAgcHJvdGVjdGVkIGluamVjdChjYWxsZWVNb2R1bGU6IE1vZHVsZSwgbmFtZTogc3RyaW5nKSB7XG4gICAgLy8gdmFyIGRpciA9IHRoaXMucXVpY2tTZWFyY2hEaXJCeUZpbGUoY2FsbGVlTW9kdWxlLmZpbGVuYW1lKTtcbiAgICB2YXIgZm1hcHMgPSB0aGlzLmZhY3RvcnlNYXBzRm9yRmlsZShjYWxsZWVNb2R1bGUuZmlsZW5hbWUpO1xuICAgIGlmIChmbWFwcy5sZW5ndGggPT09IDApXG4gICAgICByZXR1cm4gdGhpcy5vbGRSZXF1aXJlLmNhbGwoY2FsbGVlTW9kdWxlLCBuYW1lKTtcbiAgICB2YXIgaW5qZWN0ZWQ7XG4gICAgdmFyIG1hdGNoID0gXy5zb21lKGZtYXBzLCBmYWN0b3J5TWFwID0+IHtcbiAgICAgIHZhciBpbmplY3RvciA9IGZhY3RvcnlNYXAubWF0Y2hSZXF1aXJlKG5hbWUpO1xuICAgICAgaWYgKGluamVjdG9yID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuY29uZmlnLmRlYnVnKSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnaW5qZWN0ICVzJywgbmFtZSk7XG4gICAgICB9XG4gICAgICBpbmplY3RlZCA9IGZhY3RvcnlNYXAuZ2V0SW5qZWN0ZWQoaW5qZWN0b3IsIGNhbGxlZU1vZHVsZS5maWxlbmFtZSwgY2FsbGVlTW9kdWxlLCB0aGlzLm9sZFJlcXVpcmUpO1xuICAgICAgdGhpcy5lbWl0KCdpbmplY3QnLCBjYWxsZWVNb2R1bGUuZmlsZW5hbWUpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgaWYgKCFtYXRjaClcbiAgICAgIHJldHVybiB0aGlzLm9sZFJlcXVpcmUuY2FsbChjYWxsZWVNb2R1bGUsIG5hbWUpO1xuICAgIHJldHVybiBpbmplY3RlZDtcbiAgfVxuXG4gIHByb3RlY3RlZCByZXBsYWNpbmdSZXF1aXJlKGNhbGxlZU1vZHVsZTogTW9kdWxlLCBwYXRoOiBzdHJpbmcpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHRoaXMuaW5qZWN0KGNhbGxlZU1vZHVsZSwgcGF0aCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKHRoaXMuY29uZmlnLmRlYnVnKVxuICAgICAgICBsb2cuZGVidWcoJ3JlcXVpcmUgZnJvbSA6ICcsIGNhbGxlZU1vZHVsZS5maWxlbmFtZSwgZS5tZXNzYWdlKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB7SW5qZWN0b3IgYXMgZGVmYXVsdCwgSW5qZWN0b3IgYXMgTm9kZUluamVjdG9yfTtcblxuLyoqXG4gKiBJZiBhIHBhdGggY29udGFpbnMgc3ltYm9saWMgbGluaywgcmV0dXJuIHRoZSBleGFjdCByZWFsIHBhdGhcbiAqIFVubGlrZSBmcy5yZWFscGF0aCwgaXQgYWxzbyB3b3JrcyBmb3Igbm9uZXhpc3QgcGF0aFxuICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN5bWxpbmsocGF0aDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgZnMuYWNjZXNzU3luYyhwYXRoLCBmcy5jb25zdGFudHMuRl9PSyk7XG4gICAgcmV0dXJuIGZzLnJlYWxwYXRoU3luYyhwYXRoKTtcbiAgfSBjYXRjaCAoZSkge31cbiAgcGF0aCA9IFBhdGgucmVzb2x2ZShwYXRoKTtcbiAgdmFyIHBhcnNlZCA9IFBhdGgucGFyc2UocGF0aCk7XG4gIHZhciBkaXIgPSBwYXJzZWQucm9vdDtcbiAgdmFyIHBhdGhFbGVtZW50cyA9IHBhdGguc3BsaXQoUGF0aC5zZXApLnNsaWNlKDEpO1xuICBwYXRoRWxlbWVudHMuc29tZSgoZWwsIGluZGV4KSA9PiB7XG4gICAgaWYgKCFfLmVuZHNXaXRoKGRpciwgUGF0aC5zZXApKVxuICAgICAgZGlyICs9IFBhdGguc2VwO1xuICAgIGRpciArPSBlbDtcbiAgICB0cnkge1xuICAgICAgZnMuYWNjZXNzU3luYyhkaXIsIGZzLmNvbnN0YW50cy5GX09LKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB2YXIgcmVzdFBhcnQgPSBwYXRoRWxlbWVudHMuc2xpY2UoaW5kZXggKyAxKS5qb2luKFBhdGguc2VwKTtcbiAgICAgIGRpciArPSByZXN0UGFydC5sZW5ndGggPiAwID8gUGF0aC5zZXAgKyByZXN0UGFydCA6IHJlc3RQYXJ0O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChmcy5sc3RhdFN5bmMoZGlyKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICB2YXIgbGluayA9IGZzLnJlYWRsaW5rU3luYyhkaXIpO1xuICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKFBhdGguZGlybmFtZShkaXIpLCBsaW5rKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIGRpcjtcbn1cblxuZnVuY3Rpb24gZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24obmFtZTogc3RyaW5nIHwgUmVnRXhwLCBSZWdFeHA6IHN0cmluZ3wgRmFjdG9yeUZ1bmMpOiBGYWN0b3J5TWFwSW50ZXJmIHtcbiAgcmV0dXJuIGVtcHR5RmFjdG9yeU1hcDtcbn1cbiJdfQ==