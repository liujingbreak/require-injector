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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1sb2FkZXItdXNhZ2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9zYW1wbGVzL3dlYnBhY2stbG9hZGVyLXVzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGdGQUFnRTtBQUloRSxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFlLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztBQUN4RCwyQkFBMkI7QUFDM0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7QUFFckQsTUFBTSxPQUFPLEdBQWtCO0lBQzdCLFFBQVEsRUFBRSxXQUFXO0lBQ3JCLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRztRQUNwQixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0NBQ0YsQ0FBQztBQUVGLG1CQUF3QixNQUF3QjtJQUM5QyxNQUFNLENBQUMsTUFBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDeEIsSUFBSSxFQUFFLG9CQUFvQjtRQUMxQixHQUFHLEVBQUU7WUFDSDtnQkFDRSxNQUFNLEVBQUUsaUNBQWlDO2dCQUN6QyxPQUFPO2FBQ1I7U0FDRjtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUM7QUFWRCw0QkFVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZXF1aXJlSW5qZWN0b3IsIHtMb2FkZXJPcHRpb25zfSBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIHdwIGZyb20gJ3dlYnBhY2snO1xuXG5jb25zdCB3ZWJJbmplY3RvciA9IG5ldyBSZXF1aXJlSW5qZWN0b3Ioe25vTm9kZTogdHJ1ZX0pO1xuLyoqIENhY2hlZCBBU1QgZm9yIGZpbGVzICovXG5jb25zdCBhc3RDYWNoZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPigpO1xuXG5jb25zdCBvcHRpb25zOiBMb2FkZXJPcHRpb25zID0ge1xuICBpbmplY3Rvcjogd2ViSW5qZWN0b3IsXG4gIG9uQXN0Q3JlYXRlZChmaWxlLCBhc3QpIHtcbiAgICBhc3RDYWNoZU1hcC5zZXQoZmlsZSwgYXN0KTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29uZmlnOiB3cC5Db25maWd1cmF0aW9uKSB7XG4gIGNvbmZpZy5tb2R1bGUhLnJ1bGVzLnB1c2goe1xuICAgIHRlc3Q6IC9cXC4odHN8dHN4fGpzfGpzeCkkLyxcbiAgICB1c2U6IFtcbiAgICAgIHtcbiAgICAgICAgbG9hZGVyOiAncmVxdWlyZS1pbmplY3Rvci93ZWJwYWNrLWxvYWRlcicsXG4gICAgICAgIG9wdGlvbnNcbiAgICAgIH1cbiAgICBdXG4gIH0pO1xufVxuXG4iXX0=