"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const require_injector_1 = tslib_1.__importDefault(require("require-injector"));
const webInjector = new require_injector_1.default({ noNode: true });
/** Cached AST for files */
const astCacheMap = new Map();
const options = {
    injector: webInjector,
    onAstCreated(file, ast) {
        astCacheMap.set(file, ast);
    }
};
function default_1(config) {
    config.module.rules.push({
        test: /\.(ts|tsx|js|jsx)$/,
        use: [
            {
                loader: 'require-injector/webpack-loader',
                options
            }
        ]
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1sb2FkZXItdXNhZ2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9zYW1wbGVzL3dlYnBhY2stbG9hZGVyLXVzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGdGQUFnRTtBQUloRSxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFlLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztBQUN4RCwyQkFBMkI7QUFDM0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7QUFFckQsTUFBTSxPQUFPLEdBQWtCO0lBQzdCLFFBQVEsRUFBRSxXQUFXO0lBQ3JCLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRztRQUNwQixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0NBQ0YsQ0FBQztBQUVGLG1CQUF3QixNQUF3QjtJQUM5QyxNQUFNLENBQUMsTUFBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDeEIsSUFBSSxFQUFFLG9CQUFvQjtRQUMxQixHQUFHLEVBQUU7WUFDSDtnQkFDRSxNQUFNLEVBQUUsaUNBQWlDO2dCQUN6QyxPQUFPO2FBQ1I7U0FDRjtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUM7QUFWRCw0QkFVQyJ9