"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstance = exports.default = void 0;
const tslib_1 = require("tslib");
const replace_require_1 = tslib_1.__importDefault(require("./replace-require"));
exports.default = replace_require_1.default;
let instance;
function getInstance(options) {
    if (instance == null)
        instance = new replace_require_1.default(options);
    return instance;
}
exports.getInstance = getInstance;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBRUEsZ0ZBQXlDO0FBSXJCLGtCQUpiLHlCQUFRLENBSVk7QUFNM0IsSUFBSSxRQUF5QixDQUFDO0FBQzlCLFNBQWdCLFdBQVcsQ0FBQyxPQUF1QjtJQUNsRCxJQUFJLFFBQVEsSUFBSSxJQUFJO1FBQ25CLFFBQVEsR0FBRyxJQUFJLHlCQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEMsT0FBTyxRQUFRLENBQUM7QUFDakIsQ0FBQztBQUpELGtDQUlDIn0=