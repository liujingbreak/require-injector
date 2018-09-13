"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const replace_require_1 = require("./replace-require");
exports.default = replace_require_1.default;
let instance;
function getInstance(options) {
    if (instance == null)
        instance = new replace_require_1.default(options);
    return instance;
}
exports.getInstance = getInstance;
//# sourceMappingURL=index.js.map