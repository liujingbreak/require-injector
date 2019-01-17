"use strict";
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
const log = require('log4js').getLogger('require-injector.cssLoader');
var lu = require('loader-utils');
var rj = require('.');
/**
 * Some legacy LESS files reply on npm-import-plugin, which are using convention like
 * "import 'npm://bootstrap/less/bootstrap';" to locate LESS file from node_modules,
 * but with Webpack resolver, it changes to use `@import "~bootstrap/less/bootstrap";`.
 *
 * This loader replaces all "import ... npm://"s with webpack's "import ... ~" style,
 * and works with require-injector to replace package.
 */
function loader(content, sourcemap) {
    var callback = this.async();
    if (!callback)
        throw new Error('Must be used as async loader');
    var opts = lu.getOptions(this);
    loadAsync(content, this, opts)
        .then(result => callback(null, result, sourcemap))
        .catch(err => {
        this.emitError(err);
        callback(err);
    });
}
function loadAsync(content, loader, opts) {
    var file = loader.resourcePath;
    content = injectReplace(content, file, loader, opts);
    return Promise.resolve(content);
}
function injectReplace(content, file, loader, opts) {
    var replaced = content.replace(/@import\s+(?:\([^\)]*\)\s+)?["'](?:npm:\/\/|~(?!\/))((?:@[^\/]+\/)?[^\/]+)(\/.+?)?["'];?/g, (match, packageName, relPath, offset, whole) => {
        if (relPath == null)
            relPath = '';
        var packageResourcePath = packageName + relPath;
        var newPackage = _getInjectedPackage(file, packageResourcePath, opts ? opts.injector : null);
        if (newPackage) {
            log.info(`Found injected less import target: ${packageResourcePath}, replaced to ${newPackage}`);
            packageResourcePath = newPackage;
            return '@import "~' + packageResourcePath + '";';
        }
        else if (newPackage === '') { // delete whole line, do not import anything
            log.debug('Remove import');
            return `/* Deleted by npmimport-css-loader ${match}*/`;
        }
        return '@import "~' + packageResourcePath + '";';
    });
    return replaced;
}
/**
 *
 * @param {*} file
 * @param {*} origPackageName
 * @return {*} could be {string} for injected package name, {null} for no injection,
 * empty string for `replaceCode` with falsy value
 */
function _getInjectedPackage(file, origPackageName, injector) {
    if (!injector)
        injector = rj;
    const fmaps = injector.factoryMapsForFile(file);
    let replaced = null;
    if (fmaps.length > 0) {
        _.some(fmaps, factoryMap => {
            const ijSetting = factoryMap.matchRequire(origPackageName);
            if (!ijSetting)
                return false;
            if (ijSetting.method === 'substitute') {
                replaced = _.isFunction(ijSetting.value) ?
                    ijSetting.value(file, ijSetting.execResult) : ijSetting.value;
                replaced += ijSetting.subPath;
                return true;
            }
            else if (ijSetting.method === 'replaceCode') {
                replaced = _.isFunction(ijSetting.value) ?
                    ijSetting.value(file, ijSetting.execResult) : ijSetting.value;
                if (!replaced)
                    replaced = '';
                else
                    replaced = null;
                return true;
            }
            return false;
        });
    }
    return replaced;
}
(function (loader) {
    loader.getInjectedPackage = _getInjectedPackage;
})(loader || (loader = {}));
module.exports = loader;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzLWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2Nzcy1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrREFBNEI7QUFHNUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3RFLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNqQyxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdEI7Ozs7Ozs7R0FPRztBQUNILFNBQVMsTUFBTSxDQUFDLE9BQWUsRUFBRSxTQUFjO0lBQzlDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMsUUFBUTtRQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztJQUNqRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztTQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztTQUNqRCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDWixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLE9BQWUsRUFBRSxNQUE4QixFQUFFLElBQXdCO0lBQzNGLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDL0IsT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1B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