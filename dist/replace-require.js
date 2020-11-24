"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_inject_1 = tslib_1.__importDefault(require("./node-inject"));
const _ = tslib_1.__importStar(require("lodash"));
const through = require("through2");
const parse_ts_import_1 = require("./parse-ts-import");
var log = require('@log4js-node/log4js-api').getLogger('require-injector.replace-require');
// function replace(code: string, factoryMaps: FactoryMap[], fileParam: any, ast: any) {
//   return new ReplaceRequire().replace(code, factoryMaps, fileParam, ast);
//   // return ReplaceRequire.prototype.replace.apply(new ReplaceRequire(), arguments);
// }
class ReplaceRequire extends node_inject_1.default {
    /**
       * opts.enableFactoryParamFile `true` if you need "filePath" as parameter for .factory(factory(filePath) {...})
       * 	this will expose original source file path in code, default is `false`.
       */
    constructor(opts) {
        super(opts);
        if (!(this instanceof ReplaceRequire)) {
            return new ReplaceRequire(opts);
        }
        var self = this;
        this.tsParser = new parse_ts_import_1.TypescriptParser(this);
        this.transform = function (file) {
            if (!_.endsWith(file, '.js')) {
                return through();
            }
            var data = '';
            return through(write, end);
            function write(buf, enc, next) {
                data += buf;
                next();
            }
            function end(next) {
                this.push(self.injectToFile(file, data));
                next();
            }
        };
    }
    changeTsCompiler(tsCompiler) {
        this.tsParser.ts = tsCompiler;
    }
    cleanup() {
        this.removeAllListeners('replace');
        super.cleanup();
    }
    /**
       * Here "inject" is actually "replacement".
       Parsing a matched file to Acorn AST tree, looking for matched `require(module)` expression and replacing
        them with proper values, expression.
       * @name injectToFile
       * @param  {string} filePath file path
       * @param  {string} code     content of file
       * @param  {object} ast      optional, if you have already parsed code to AST tree, pass it to this function which
       *  helps to speed up process by skip parsing again.
       * @return {string}          replaced source code, if there is no injectable `require()`,
       * 	same source code will be returned.
       */
    injectToFile(filePath, code, ast) {
        return this.injectToFileWithPatchInfo(filePath, code, ast).replaced;
    }
    /**
       * @return patch information, so that other parser tool can resue AST and
       * calculate position with these patch information
       */
    injectToFileWithPatchInfo(filePath, code, ast) {
        var factoryMaps;
        try {
            factoryMaps = this.factoryMapsForFile(filePath);
            if (factoryMaps.length > 0) {
                // if (/\.tsx?$/.test(filePath)) {
                const result = this.tsParser.replace(code, factoryMaps, filePath, ast);
                // } else
                // replaced = this.replace(code, factoryMaps, filePath, ast);
                if (result.replaced != null)
                    return result;
            }
            return { replaced: code, patches: [], ast: this.tsParser.srcfile };
        }
        catch (e) {
            log.error('filePath: ' + filePath);
            if (factoryMaps != null)
                log.error(_.map(factoryMaps, factoryMap => factoryMap.requireMap).join());
            log.error(e.stack);
            throw e;
        }
    }
    addPatch(patches, start, end, moduleName, replaceType, fmaps, fileParam) {
        var self = this;
        var setting;
        for (const factoryMap of fmaps) {
            setting = factoryMap.matchRequire(moduleName);
            if (setting) {
                var replacement = factoryMap.getReplacement(setting, replaceType, fileParam);
                if (replacement != null) {
                    patches.push({
                        start,
                        end,
                        replacement: typeof (replacement) === 'string' ?
                            replacement : replacement.code
                    });
                    self.emit('replace', moduleName, replacement);
                }
                break;
            }
        }
    }
}
exports.default = ReplaceRequire;
// export function parseCode(code: string) {
//   var ast;
//   var firstCompileErr = null;
//   try {
//     ast = acornjsx.parse(code, {allowHashBang: true, sourceType: 'module'});
//   } catch (err) {
//     firstCompileErr = err;
//     try {
//       ast = acorn.parse(code, {allowHashBang: true});
//     } catch (err2) {
//       log.error('Possible ES compilation error', firstCompileErr);
//       firstCompileErr.message += '\nOr ' + err2.message;
//       firstCompileErr.stack += '\nAnother possible compilation error is\n' + err2.stack;
//       throw firstCompileErr;
//     }
//   }
//   return ast;
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1yZXF1aXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcmVwbGFjZS1yZXF1aXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLHdFQUFzRTtBQUN0RSxrREFBNEI7QUFDNUIsb0NBQXFDO0FBQ3JDLHVEQUFtRDtBQUVuRCxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQWEzRix3RkFBd0Y7QUFDeEYsNEVBQTRFO0FBQzVFLHVGQUF1RjtBQUN2RixJQUFJO0FBRUosTUFBcUIsY0FBZSxTQUFRLHFCQUFRO0lBSWxEOzs7U0FHRTtJQUNGLFlBQVksSUFBcUI7UUFDL0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLGNBQWMsQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakM7UUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFFaEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGtDQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTNDLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBUyxJQUFZO1lBQ3BDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDNUIsT0FBTyxPQUFPLEVBQUUsQ0FBQzthQUNsQjtZQUNELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUUzQixTQUFTLEtBQUssQ0FBQyxHQUFXLEVBQUUsR0FBVyxFQUFFLElBQStCO2dCQUN0RSxJQUFJLElBQUksR0FBRyxDQUFDO2dCQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RCLENBQUM7WUFDRCxTQUFTLEdBQUcsQ0FBQyxJQUErQjtnQkFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLEVBQUUsQ0FBQztZQUNULENBQUM7UUFDSCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsVUFBcUI7UUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsVUFBVSxDQUFDO0lBQ2hDLENBQUM7SUFFRCxPQUFPO1FBQ0wsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25DLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBQ0Q7Ozs7Ozs7Ozs7O1NBV0U7SUFDRixZQUFZLENBQUMsUUFBZ0IsRUFBRSxJQUFZLEVBQUUsR0FBbUI7UUFDOUQsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7SUFDdEUsQ0FBQztJQUVEOzs7U0FHRTtJQUNGLHlCQUF5QixDQUFDLFFBQWdCLEVBQUUsSUFBWSxFQUFFLEdBQW1CO1FBRTNFLElBQUksV0FBbUMsQ0FBQztRQUN4QyxJQUFJO1lBQ0YsV0FBVyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNoRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMxQixrQ0FBa0M7Z0JBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN2RSxTQUFTO2dCQUNQLDZEQUE2RDtnQkFDL0QsSUFBSSxNQUFNLENBQUMsUUFBUSxJQUFJLElBQUk7b0JBQ3pCLE9BQU8sTUFJTixDQUFDO2FBQ0w7WUFDRCxPQUFPLEVBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBQyxDQUFDO1NBQ2xFO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsQ0FBQztZQUNuQyxJQUFJLFdBQVcsSUFBSSxJQUFJO2dCQUNyQixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDNUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkIsTUFBTSxDQUFDLENBQUM7U0FDVDtJQUNILENBQUM7SUFFRCxRQUFRLENBQUMsT0FBeUIsRUFBRSxLQUFhLEVBQUUsR0FBVyxFQUFFLFVBQWtCLEVBQ2hGLFdBQXdCLEVBQUUsS0FBbUIsRUFBRSxTQUFpQjtRQUNoRSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFDaEIsSUFBSSxPQUFPLENBQUM7UUFDWixLQUFLLE1BQU0sVUFBVSxJQUFJLEtBQUssRUFBRTtZQUM5QixPQUFPLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM5QyxJQUFJLE9BQU8sRUFBRTtnQkFDWCxJQUFJLFdBQVcsR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzdFLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtvQkFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDWCxLQUFLO3dCQUNMLEdBQUc7d0JBQ0gsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQzs0QkFDOUMsV0FBcUIsQ0FBQyxDQUFDLENBQUUsV0FBOEIsQ0FBQyxJQUFJO3FCQUMvRCxDQUFDLENBQUM7b0JBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUMvQztnQkFDRCxNQUFNO2FBQ1A7U0FDRjtJQUNILENBQUM7Q0FDRjtBQTlHRCxpQ0E4R0M7QUFFRCw0Q0FBNEM7QUFDNUMsYUFBYTtBQUNiLGdDQUFnQztBQUNoQyxVQUFVO0FBQ1YsK0VBQStFO0FBQy9FLG9CQUFvQjtBQUNwQiw2QkFBNkI7QUFDN0IsWUFBWTtBQUNaLHdEQUF3RDtBQUN4RCx1QkFBdUI7QUFDdkIscUVBQXFFO0FBQ3JFLDJEQUEyRDtBQUMzRCwyRkFBMkY7QUFDM0YsK0JBQStCO0FBQy9CLFFBQVE7QUFDUixNQUFNO0FBQ04sZ0JBQWdCO0FBQ2hCLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWVtYmVyLW9yZGVyaW5nXG5pbXBvcnQge1RyYW5zZm9ybX0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4vcGF0Y2gtdGV4dCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0ZhY3RvcnlNYXAsIFJlcGxhY2VUeXBlLCBSZXBsYWNlZFJlc3VsdCwgRmFjdG9yeU1hcEludGVyZn0gZnJvbSAnLi9mYWN0b3J5LW1hcCc7XG5pbXBvcnQgSW5qZWN0b3IsIHtJbmplY3Rvck9wdGlvbiwgUmVzb2x2ZU9wdGlvbn0gZnJvbSAnLi9ub2RlLWluamVjdCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdGhyb3VnaCA9IHJlcXVpcmUoJ3Rocm91Z2gyJyk7XG5pbXBvcnQge1R5cGVzY3JpcHRQYXJzZXJ9IGZyb20gJy4vcGFyc2UtdHMtaW1wb3J0JztcblxudmFyIGxvZyA9IHJlcXVpcmUoJ0Bsb2c0anMtbm9kZS9sb2c0anMtYXBpJykuZ2V0TG9nZ2VyKCdyZXF1aXJlLWluamVjdG9yLnJlcGxhY2UtcmVxdWlyZScpO1xuXG4vLyBhY29ybmpzeCA9IGFjb3JuSW1wSW5qZWN0KGFjb3JuKTtcblxuZXhwb3J0IGludGVyZmFjZSBSZXF1aXJlSW5qZWN0b3Ige1xuICBmcm9tUGFja2FnZShwYWNrYWdlTmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIHJlc29sdmVPcHQ/OiBSZXNvbHZlT3B0aW9uKTogRmFjdG9yeU1hcEludGVyZjtcbiAgZnJvbURpcihkaXI6IHN0cmluZyB8IHN0cmluZ1tdKTogRmFjdG9yeU1hcEludGVyZjtcbiAgZnJvbVJvb3QoKTogRmFjdG9yeU1hcEludGVyZjtcbiAgdHJhbnNmb3JtKGZpbGU6IHN0cmluZyk6IFRyYW5zZm9ybTtcbiAgaW5qZWN0VG9GaWxlKGZpbGVQYXRoOiBzdHJpbmcsIGNvZGU6IHN0cmluZywgYXN0PzogYW55KTogc3RyaW5nO1xuICBjbGVhbnVwKCk6IHZvaWQ7XG59XG5cbi8vIGZ1bmN0aW9uIHJlcGxhY2UoY29kZTogc3RyaW5nLCBmYWN0b3J5TWFwczogRmFjdG9yeU1hcFtdLCBmaWxlUGFyYW06IGFueSwgYXN0OiBhbnkpIHtcbi8vICAgcmV0dXJuIG5ldyBSZXBsYWNlUmVxdWlyZSgpLnJlcGxhY2UoY29kZSwgZmFjdG9yeU1hcHMsIGZpbGVQYXJhbSwgYXN0KTtcbi8vICAgLy8gcmV0dXJuIFJlcGxhY2VSZXF1aXJlLnByb3RvdHlwZS5yZXBsYWNlLmFwcGx5KG5ldyBSZXBsYWNlUmVxdWlyZSgpLCBhcmd1bWVudHMpO1xuLy8gfVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZXBsYWNlUmVxdWlyZSBleHRlbmRzIEluamVjdG9yIGltcGxlbWVudHMgUmVxdWlyZUluamVjdG9yIHtcblxuICB0cmFuc2Zvcm06IChmaWxlOiBzdHJpbmcpID0+IFRyYW5zZm9ybTtcbiAgcHJvdGVjdGVkIHRzUGFyc2VyOiBUeXBlc2NyaXB0UGFyc2VyO1xuICAvKipcblx0ICogb3B0cy5lbmFibGVGYWN0b3J5UGFyYW1GaWxlIGB0cnVlYCBpZiB5b3UgbmVlZCBcImZpbGVQYXRoXCIgYXMgcGFyYW1ldGVyIGZvciAuZmFjdG9yeShmYWN0b3J5KGZpbGVQYXRoKSB7Li4ufSlcblx0ICogXHR0aGlzIHdpbGwgZXhwb3NlIG9yaWdpbmFsIHNvdXJjZSBmaWxlIHBhdGggaW4gY29kZSwgZGVmYXVsdCBpcyBgZmFsc2VgLlxuXHQgKi9cbiAgY29uc3RydWN0b3Iob3B0cz86IEluamVjdG9yT3B0aW9uKSB7XG4gICAgc3VwZXIob3B0cyk7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJlcGxhY2VSZXF1aXJlKSkge1xuICAgICAgcmV0dXJuIG5ldyBSZXBsYWNlUmVxdWlyZShvcHRzKTtcbiAgICB9XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdGhpcy50c1BhcnNlciA9IG5ldyBUeXBlc2NyaXB0UGFyc2VyKHRoaXMpO1xuXG4gICAgdGhpcy50cmFuc2Zvcm0gPSBmdW5jdGlvbihmaWxlOiBzdHJpbmcpIHtcbiAgICAgIGlmICghXy5lbmRzV2l0aChmaWxlLCAnLmpzJykpIHtcbiAgICAgICAgcmV0dXJuIHRocm91Z2goKTtcbiAgICAgIH1cbiAgICAgIHZhciBkYXRhID0gJyc7XG4gICAgICByZXR1cm4gdGhyb3VnaCh3cml0ZSwgZW5kKTtcblxuICAgICAgZnVuY3Rpb24gd3JpdGUoYnVmOiBzdHJpbmcsIGVuYzogc3RyaW5nLCBuZXh0OiB0aHJvdWdoLlRyYW5zZm9ybUNhbGxiYWNrKSB7XG4gICAgICAgIGRhdGEgKz0gYnVmOyBuZXh0KCk7XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBlbmQobmV4dDogdGhyb3VnaC5UcmFuc2Zvcm1DYWxsYmFjaykge1xuICAgICAgICB0aGlzLnB1c2goc2VsZi5pbmplY3RUb0ZpbGUoZmlsZSwgZGF0YSkpO1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGNoYW5nZVRzQ29tcGlsZXIodHNDb21waWxlcjogdHlwZW9mIHRzKSB7XG4gICAgdGhpcy50c1BhcnNlci50cyA9IHRzQ29tcGlsZXI7XG4gIH1cblxuICBjbGVhbnVwKCkge1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZXBsYWNlJyk7XG4gICAgc3VwZXIuY2xlYW51cCgpO1xuICB9XG4gIC8qKlxuXHQgKiBIZXJlIFwiaW5qZWN0XCIgaXMgYWN0dWFsbHkgXCJyZXBsYWNlbWVudFwiLlxuXHQgUGFyc2luZyBhIG1hdGNoZWQgZmlsZSB0byBBY29ybiBBU1QgdHJlZSwgbG9va2luZyBmb3IgbWF0Y2hlZCBgcmVxdWlyZShtb2R1bGUpYCBleHByZXNzaW9uIGFuZCByZXBsYWNpbmdcblx0ICB0aGVtIHdpdGggcHJvcGVyIHZhbHVlcywgZXhwcmVzc2lvbi5cblx0ICogQG5hbWUgaW5qZWN0VG9GaWxlXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gZmlsZVBhdGggZmlsZSBwYXRoXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gY29kZSAgICAgY29udGVudCBvZiBmaWxlXG5cdCAqIEBwYXJhbSAge29iamVjdH0gYXN0ICAgICAgb3B0aW9uYWwsIGlmIHlvdSBoYXZlIGFscmVhZHkgcGFyc2VkIGNvZGUgdG8gQVNUIHRyZWUsIHBhc3MgaXQgdG8gdGhpcyBmdW5jdGlvbiB3aGljaFxuXHQgKiAgaGVscHMgdG8gc3BlZWQgdXAgcHJvY2VzcyBieSBza2lwIHBhcnNpbmcgYWdhaW4uXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgICAgcmVwbGFjZWQgc291cmNlIGNvZGUsIGlmIHRoZXJlIGlzIG5vIGluamVjdGFibGUgYHJlcXVpcmUoKWAsXG5cdCAqIFx0c2FtZSBzb3VyY2UgY29kZSB3aWxsIGJlIHJldHVybmVkLlxuXHQgKi9cbiAgaW5qZWN0VG9GaWxlKGZpbGVQYXRoOiBzdHJpbmcsIGNvZGU6IHN0cmluZywgYXN0PzogdHMuU291cmNlRmlsZSkge1xuICAgIHJldHVybiB0aGlzLmluamVjdFRvRmlsZVdpdGhQYXRjaEluZm8oZmlsZVBhdGgsIGNvZGUsIGFzdCkucmVwbGFjZWQ7XG4gIH1cblxuICAvKipcblx0ICogQHJldHVybiBwYXRjaCBpbmZvcm1hdGlvbiwgc28gdGhhdCBvdGhlciBwYXJzZXIgdG9vbCBjYW4gcmVzdWUgQVNUIGFuZCBcblx0ICogY2FsY3VsYXRlIHBvc2l0aW9uIHdpdGggdGhlc2UgcGF0Y2ggaW5mb3JtYXRpb25cblx0ICovXG4gIGluamVjdFRvRmlsZVdpdGhQYXRjaEluZm8oZmlsZVBhdGg6IHN0cmluZywgY29kZTogc3RyaW5nLCBhc3Q/OiB0cy5Tb3VyY2VGaWxlKTpcbiAge3JlcGxhY2VkOiBzdHJpbmcsIHBhdGNoZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgcmVwbGFjZW1lbnQ6IHN0cmluZ30+LCBhc3Q6IHRzLlNvdXJjZUZpbGV9IHtcbiAgICB2YXIgZmFjdG9yeU1hcHM6IEZhY3RvcnlNYXBbXXx1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGZhY3RvcnlNYXBzID0gdGhpcy5mYWN0b3J5TWFwc0ZvckZpbGUoZmlsZVBhdGgpO1xuICAgICAgaWYgKGZhY3RvcnlNYXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gaWYgKC9cXC50c3g/JC8udGVzdChmaWxlUGF0aCkpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy50c1BhcnNlci5yZXBsYWNlKGNvZGUsIGZhY3RvcnlNYXBzLCBmaWxlUGF0aCwgYXN0KTtcbiAgICAgICAgLy8gfSBlbHNlXG4gICAgICAgICAgLy8gcmVwbGFjZWQgPSB0aGlzLnJlcGxhY2UoY29kZSwgZmFjdG9yeU1hcHMsIGZpbGVQYXRoLCBhc3QpO1xuICAgICAgICBpZiAocmVzdWx0LnJlcGxhY2VkICE9IG51bGwpXG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyB7XG4gICAgICAgICAgICByZXBsYWNlZDogc3RyaW5nO1xuICAgICAgICAgICAgcGF0Y2hlczogQXJyYXk8e3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCByZXBsYWNlbWVudDogc3RyaW5nfT47XG4gICAgICAgICAgICBhc3Q6IHRzLlNvdXJjZUZpbGVcbiAgICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtyZXBsYWNlZDogY29kZSwgcGF0Y2hlczogW10sIGFzdDogdGhpcy50c1BhcnNlci5zcmNmaWxlfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2cuZXJyb3IoJ2ZpbGVQYXRoOiAnICsgZmlsZVBhdGgpO1xuICAgICAgaWYgKGZhY3RvcnlNYXBzICE9IG51bGwpXG4gICAgICAgIGxvZy5lcnJvcihfLm1hcChmYWN0b3J5TWFwcywgZmFjdG9yeU1hcCA9PiBmYWN0b3J5TWFwLnJlcXVpcmVNYXApLmpvaW4oKSk7XG4gICAgICBsb2cuZXJyb3IoZS5zdGFjayk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIGFkZFBhdGNoKHBhdGNoZXM6IFJlcGxhY2VtZW50SW5mW10sIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCBtb2R1bGVOYW1lOiBzdHJpbmcsXG4gICAgcmVwbGFjZVR5cGU6IFJlcGxhY2VUeXBlLCBmbWFwczogRmFjdG9yeU1hcFtdLCBmaWxlUGFyYW06IHN0cmluZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2V0dGluZztcbiAgICBmb3IgKGNvbnN0IGZhY3RvcnlNYXAgb2YgZm1hcHMpIHtcbiAgICAgIHNldHRpbmcgPSBmYWN0b3J5TWFwLm1hdGNoUmVxdWlyZShtb2R1bGVOYW1lKTtcbiAgICAgIGlmIChzZXR0aW5nKSB7XG4gICAgICAgIHZhciByZXBsYWNlbWVudCA9IGZhY3RvcnlNYXAuZ2V0UmVwbGFjZW1lbnQoc2V0dGluZywgcmVwbGFjZVR5cGUsIGZpbGVQYXJhbSk7XG4gICAgICAgIGlmIChyZXBsYWNlbWVudCAhPSBudWxsKSB7XG4gICAgICAgICAgcGF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICAgIHN0YXJ0LFxuICAgICAgICAgICAgZW5kLFxuICAgICAgICAgICAgcmVwbGFjZW1lbnQ6IHR5cGVvZiAocmVwbGFjZW1lbnQpID09PSAnc3RyaW5nJyA/XG4gICAgICAgICAgICAgIHJlcGxhY2VtZW50IGFzIHN0cmluZyA6IChyZXBsYWNlbWVudCBhcyBSZXBsYWNlZFJlc3VsdCkuY29kZVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHNlbGYuZW1pdCgncmVwbGFjZScsIG1vZHVsZU5hbWUsIHJlcGxhY2VtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQ29kZShjb2RlOiBzdHJpbmcpIHtcbi8vICAgdmFyIGFzdDtcbi8vICAgdmFyIGZpcnN0Q29tcGlsZUVyciA9IG51bGw7XG4vLyAgIHRyeSB7XG4vLyAgICAgYXN0ID0gYWNvcm5qc3gucGFyc2UoY29kZSwge2FsbG93SGFzaEJhbmc6IHRydWUsIHNvdXJjZVR5cGU6ICdtb2R1bGUnfSk7XG4vLyAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgIGZpcnN0Q29tcGlsZUVyciA9IGVycjtcbi8vICAgICB0cnkge1xuLy8gICAgICAgYXN0ID0gYWNvcm4ucGFyc2UoY29kZSwge2FsbG93SGFzaEJhbmc6IHRydWV9KTtcbi8vICAgICB9IGNhdGNoIChlcnIyKSB7XG4vLyAgICAgICBsb2cuZXJyb3IoJ1Bvc3NpYmxlIEVTIGNvbXBpbGF0aW9uIGVycm9yJywgZmlyc3RDb21waWxlRXJyKTtcbi8vICAgICAgIGZpcnN0Q29tcGlsZUVyci5tZXNzYWdlICs9ICdcXG5PciAnICsgZXJyMi5tZXNzYWdlO1xuLy8gICAgICAgZmlyc3RDb21waWxlRXJyLnN0YWNrICs9ICdcXG5Bbm90aGVyIHBvc3NpYmxlIGNvbXBpbGF0aW9uIGVycm9yIGlzXFxuJyArIGVycjIuc3RhY2s7XG4vLyAgICAgICB0aHJvdyBmaXJzdENvbXBpbGVFcnI7XG4vLyAgICAgfVxuLy8gICB9XG4vLyAgIHJldHVybiBhc3Q7XG4vLyB9XG4iXX0=