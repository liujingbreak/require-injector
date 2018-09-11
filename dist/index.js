"use strict";
const replace_require_1 = require("./replace-require");
let instance;
function delegate(option) {
    instance = new replace_require_1.default(option);
    return instance;
}
(function (delegate) {
    function getInstance() {
        if (instance == null)
            instance = new replace_require_1.default();
        return instance;
    }
    delegate.getInstance = getInstance;
    function fromPackage(packageName, resolveOpt) {
        return instance.fromPackage(packageName, resolveOpt);
    }
    delegate.fromPackage = fromPackage;
    function fromDir(dir) {
        return instance.fromDir(dir);
    }
    delegate.fromDir = fromDir;
    function transform(file) {
        return instance.transform(file);
    }
    delegate.transform = transform;
    function injectToFile(filePath, code, ast) {
        return instance.injectToFile(filePath, code, ast);
    }
    delegate.injectToFile = injectToFile;
    function cleanup() {
        if (instance)
            instance.cleanup();
        instance = null;
    }
    delegate.cleanup = cleanup;
})(delegate || (delegate = {}));
module.exports = delegate;
//# sourceMappingURL=index.js.map