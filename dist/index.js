"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxnRkFBeUM7QUFJckIsa0JBSmIseUJBQVEsQ0FJWTtBQUszQixJQUFJLFFBQXlCLENBQUM7QUFDOUIsU0FBZ0IsV0FBVyxDQUFDLE9BQXVCO0lBQ2xELElBQUksUUFBUSxJQUFJLElBQUk7UUFDbkIsUUFBUSxHQUFHLElBQUkseUJBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsQyxPQUFPLFFBQVEsQ0FBQztBQUNqQixDQUFDO0FBSkQsa0NBSUMifQ==