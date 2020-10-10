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
        var newPackage = _getInjectedPackage(file, packageResourcePath, opts ? opts.injector : undefined);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzLWxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2Nzcy1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrREFBNEI7QUFHNUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3RFLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNqQyxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdEI7Ozs7Ozs7R0FPRztBQUNILFNBQVMsTUFBTSxDQUFDLE9BQWUsRUFBRSxTQUFjO0lBQzlDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMsUUFBUTtRQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztJQUNqRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztTQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztTQUNqRCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDWixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLE9BQWUsRUFBRSxNQUE4QixFQUFFLElBQXdCO0lBQzNGLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDL0IsT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1B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O1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztLQUNIO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDakIsQ0FBQztBQUVELFdBQVUsTUFBTTtJQUNGLHlCQUFrQixHQUFHLG1CQUFtQixDQUFDO0FBQ3ZELENBQUMsRUFGUyxNQUFNLEtBQU4sTUFBTSxRQUVmO0FBRUQsaUJBQVMsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IEluamVjdCBmcm9tICcuL3JlcGxhY2UtcmVxdWlyZSc7XG5pbXBvcnQge0ZhY3RvcnlGdW5jfSBmcm9tICcuL2ZhY3RvcnktbWFwJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigncmVxdWlyZS1pbmplY3Rvci5jc3NMb2FkZXInKTtcbnZhciBsdSA9IHJlcXVpcmUoJ2xvYWRlci11dGlscycpO1xudmFyIHJqID0gcmVxdWlyZSgnLicpO1xuLyoqXG4gKiBTb21lIGxlZ2FjeSBMRVNTIGZpbGVzIHJlcGx5IG9uIG5wbS1pbXBvcnQtcGx1Z2luLCB3aGljaCBhcmUgdXNpbmcgY29udmVudGlvbiBsaWtlXG4gKiBcImltcG9ydCAnbnBtOi8vYm9vdHN0cmFwL2xlc3MvYm9vdHN0cmFwJztcIiB0byBsb2NhdGUgTEVTUyBmaWxlIGZyb20gbm9kZV9tb2R1bGVzLFxuICogYnV0IHdpdGggV2VicGFjayByZXNvbHZlciwgaXQgY2hhbmdlcyB0byB1c2UgYEBpbXBvcnQgXCJ+Ym9vdHN0cmFwL2xlc3MvYm9vdHN0cmFwXCI7YC5cbiAqXG4gKiBUaGlzIGxvYWRlciByZXBsYWNlcyBhbGwgXCJpbXBvcnQgLi4uIG5wbTovL1wicyB3aXRoIHdlYnBhY2sncyBcImltcG9ydCAuLi4gflwiIHN0eWxlLFxuICogYW5kIHdvcmtzIHdpdGggcmVxdWlyZS1pbmplY3RvciB0byByZXBsYWNlIHBhY2thZ2UuXG4gKi9cbmZ1bmN0aW9uIGxvYWRlcihjb250ZW50OiBzdHJpbmcsIHNvdXJjZW1hcDogYW55KSB7XG5cdHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcblx0aWYgKCFjYWxsYmFjaylcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ011c3QgYmUgdXNlZCBhcyBhc3luYyBsb2FkZXInKTtcblx0dmFyIG9wdHMgPSBsdS5nZXRPcHRpb25zKHRoaXMpO1xuXHRsb2FkQXN5bmMoY29udGVudCwgdGhpcywgb3B0cylcblx0LnRoZW4ocmVzdWx0ID0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCwgc291cmNlbWFwKSlcblx0LmNhdGNoKGVyciA9PiB7XG5cdFx0dGhpcy5lbWl0RXJyb3IoZXJyKTtcblx0XHRjYWxsYmFjayhlcnIpO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gbG9hZEFzeW5jKGNvbnRlbnQ6IHN0cmluZywgbG9hZGVyOiB7cmVzb3VyY2VQYXRoOiBzdHJpbmd9LCBvcHRzOiB7aW5qZWN0b3I6IEluamVjdH0pIHtcblx0dmFyIGZpbGUgPSBsb2FkZXIucmVzb3VyY2VQYXRoO1xuXHRjb250ZW50ID0gaW5qZWN0UmVwbGFjZShjb250ZW50LCBmaWxlLCBsb2FkZXIsIG9wdHMpO1xuXHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNvbnRlbnQpO1xufVxuXG5mdW5jdGlvbiBpbmplY3RSZXBsYWNlKGNvbnRlbnQ6IHN0cmluZywgZmlsZTogc3RyaW5nLCBsb2FkZXI6IHtyZXNvdXJjZVBhdGg6IHN0cmluZ30sIG9wdHM6IHtpbmplY3RvcjogSW5qZWN0fSkge1xuXHR2YXIgcmVwbGFjZWQgPSBjb250ZW50LnJlcGxhY2UoXG5cdFx0L0BpbXBvcnRcXHMrKD86XFwoW15cXCldKlxcKVxccyspP1tcIiddKD86bnBtOlxcL1xcL3x+KD8hXFwvKSkoKD86QFteXFwvXStcXC8pP1teXFwvXSspKFxcLy4rPyk/W1wiJ107Py9nLFxuXHRcdChtYXRjaCwgcGFja2FnZU5hbWUsIHJlbFBhdGgsIG9mZnNldCwgd2hvbGUpID0+IHtcblx0XHRpZiAocmVsUGF0aCA9PSBudWxsKVxuXHRcdFx0cmVsUGF0aCA9ICcnO1xuXHRcdHZhciBwYWNrYWdlUmVzb3VyY2VQYXRoID0gcGFja2FnZU5hbWUgKyByZWxQYXRoO1xuXHRcdHZhciBuZXdQYWNrYWdlID0gX2dldEluamVjdGVkUGFja2FnZShmaWxlLCBwYWNrYWdlUmVzb3VyY2VQYXRoLCBvcHRzID8gb3B0cy5pbmplY3RvciA6IHVuZGVmaW5lZCk7XG5cdFx0aWYgKG5ld1BhY2thZ2UpIHtcblx0XHRcdGxvZy5pbmZvKGBGb3VuZCBpbmplY3RlZCBsZXNzIGltcG9ydCB0YXJnZXQ6ICR7cGFja2FnZVJlc291cmNlUGF0aH0sIHJlcGxhY2VkIHRvICR7bmV3UGFja2FnZX1gKTtcblx0XHRcdHBhY2thZ2VSZXNvdXJjZVBhdGggPSBuZXdQYWNrYWdlO1xuXHRcdFx0cmV0dXJuICdAaW1wb3J0IFwificgKyBwYWNrYWdlUmVzb3VyY2VQYXRoICsgJ1wiOyc7XG5cdFx0fSBlbHNlIGlmIChuZXdQYWNrYWdlID09PSAnJykgey8vIGRlbGV0ZSB3aG9sZSBsaW5lLCBkbyBub3QgaW1wb3J0IGFueXRoaW5nXG5cdFx0XHRsb2cuZGVidWcoJ1JlbW92ZSBpbXBvcnQnKTtcblx0XHRcdHJldHVybiBgLyogRGVsZXRlZCBieSBucG1pbXBvcnQtY3NzLWxvYWRlciAke21hdGNofSovYDtcblx0XHR9XG5cdFx0cmV0dXJuICdAaW1wb3J0IFwificgKyBwYWNrYWdlUmVzb3VyY2VQYXRoICsgJ1wiOyc7XG5cdH0pO1xuXHRyZXR1cm4gcmVwbGFjZWQ7XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7Kn0gZmlsZVxuICogQHBhcmFtIHsqfSBvcmlnUGFja2FnZU5hbWVcbiAqIEByZXR1cm4geyp9IGNvdWxkIGJlIHtzdHJpbmd9IGZvciBpbmplY3RlZCBwYWNrYWdlIG5hbWUsIHtudWxsfSBmb3Igbm8gaW5qZWN0aW9uLFxuICogZW1wdHkgc3RyaW5nIGZvciBgcmVwbGFjZUNvZGVgIHdpdGggZmFsc3kgdmFsdWVcbiAqL1xuZnVuY3Rpb24gX2dldEluamVjdGVkUGFja2FnZShmaWxlOiBzdHJpbmcsIG9yaWdQYWNrYWdlTmFtZTogc3RyaW5nLCBpbmplY3Rvcj86IEluamVjdCk6IHN0cmluZyB8IG51bGwge1xuXHRpZiAoIWluamVjdG9yKVxuXHRcdGluamVjdG9yID0gcmo7XG5cdGNvbnN0IGZtYXBzID0gaW5qZWN0b3IhLmZhY3RvcnlNYXBzRm9yRmlsZShmaWxlKTtcblx0bGV0IHJlcGxhY2VkID0gbnVsbDtcblx0aWYgKGZtYXBzLmxlbmd0aCA+IDApIHtcblx0XHRfLnNvbWUoZm1hcHMsIGZhY3RvcnlNYXAgPT4ge1xuXHRcdFx0Y29uc3QgaWpTZXR0aW5nID0gZmFjdG9yeU1hcC5tYXRjaFJlcXVpcmUob3JpZ1BhY2thZ2VOYW1lKTtcblx0XHRcdGlmICghaWpTZXR0aW5nKVxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRpZiAoaWpTZXR0aW5nLm1ldGhvZCA9PT0gJ3N1YnN0aXR1dGUnKSB7XG5cdFx0XHRcdHJlcGxhY2VkID0gXy5pc0Z1bmN0aW9uKGlqU2V0dGluZy52YWx1ZSkgP1xuXHRcdFx0XHRcdChpalNldHRpbmcudmFsdWUgYXMgRmFjdG9yeUZ1bmMpKGZpbGUsIGlqU2V0dGluZy5leGVjUmVzdWx0KSA6IGlqU2V0dGluZy52YWx1ZSBhcyBzdHJpbmc7XG5cdFx0XHRcdHJlcGxhY2VkICs9IGlqU2V0dGluZy5zdWJQYXRoO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0gZWxzZSBpZiAoaWpTZXR0aW5nLm1ldGhvZCA9PT0gJ3JlcGxhY2VDb2RlJykge1xuXHRcdFx0XHRyZXBsYWNlZCA9IF8uaXNGdW5jdGlvbihpalNldHRpbmcudmFsdWUpID9cblx0XHRcdFx0XHQoaWpTZXR0aW5nLnZhbHVlIGFzIEZhY3RvcnlGdW5jKShmaWxlLCBpalNldHRpbmcuZXhlY1Jlc3VsdCkgOiBpalNldHRpbmcudmFsdWUgYXMgc3RyaW5nO1xuXHRcdFx0XHRpZiAoIXJlcGxhY2VkKVxuXHRcdFx0XHRcdHJlcGxhY2VkID0gJyc7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXBsYWNlZCA9IG51bGw7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH0pO1xuXHR9XG5cdHJldHVybiByZXBsYWNlZDtcbn1cblxubmFtZXNwYWNlIGxvYWRlciB7XG5cdGV4cG9ydCBjb25zdCBnZXRJbmplY3RlZFBhY2thZ2UgPSBfZ2V0SW5qZWN0ZWRQYWNrYWdlO1xufVxuXG5leHBvcnQgPSBsb2FkZXI7XG4iXX0=