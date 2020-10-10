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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1yZXF1aXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcmVwbGFjZS1yZXF1aXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLHdFQUFzRTtBQUN0RSxrREFBNEI7QUFDNUIsb0NBQXFDO0FBQ3JDLHVEQUFtRDtBQUVuRCxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQWEzRix3RkFBd0Y7QUFDeEYsNEVBQTRFO0FBQzVFLHVGQUF1RjtBQUN2RixJQUFJO0FBRUosTUFBcUIsY0FBZSxTQUFRLHFCQUFRO0lBSWxEOzs7U0FHRTtJQUNGLFlBQVksSUFBcUI7UUFDL0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLGNBQWMsQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakM7UUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFFaEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGtDQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTNDLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBUyxJQUFZO1lBQ3BDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDNUIsT0FBTyxPQUFPLEVBQUUsQ0FBQzthQUNsQjtZQUNELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUUzQixTQUFTLEtBQUssQ0FBQyxHQUFXLEVBQUUsR0FBVyxFQUFFLElBQStCO2dCQUN0RSxJQUFJLElBQUksR0FBRyxDQUFDO2dCQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RCLENBQUM7WUFDRCxTQUFTLEdBQUcsQ0FBQyxJQUEr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R0QsaUNBMEdDO0FBRUQsNENBQTRDO0FBQzVDLGFBQWE7QUFDYixnQ0FBZ0M7QUFDaEMsVUFBVTtBQUNWLCtFQUErRTtBQUMvRSxvQkFBb0I7QUFDcEIsNkJBQTZCO0FBQzdCLFlBQVk7QUFDWix3REFBd0Q7QUFDeEQsdUJBQXVCO0FBQ3ZCLHFFQUFxRTtBQUNyRSwyREFBMkQ7QUFDM0QsMkZBQTJGO0FBQzNGLCtCQUErQjtBQUMvQixRQUFRO0FBQ1IsTUFBTTtBQUNOLGdCQUFnQjtBQUNoQixJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1lbWJlci1vcmRlcmluZ1xuaW1wb3J0IHtUcmFuc2Zvcm19IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuL3BhdGNoLXRleHQnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtGYWN0b3J5TWFwLCBSZXBsYWNlVHlwZSwgUmVwbGFjZWRSZXN1bHQsIEZhY3RvcnlNYXBJbnRlcmZ9IGZyb20gJy4vZmFjdG9yeS1tYXAnO1xuaW1wb3J0IEluamVjdG9yLCB7SW5qZWN0b3JPcHRpb24sIFJlc29sdmVPcHRpb259IGZyb20gJy4vbm9kZS1pbmplY3QnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHRocm91Z2ggPSByZXF1aXJlKCd0aHJvdWdoMicpO1xuaW1wb3J0IHtUeXBlc2NyaXB0UGFyc2VyfSBmcm9tICcuL3BhcnNlLXRzLWltcG9ydCc7XG5cbnZhciBsb2cgPSByZXF1aXJlKCdAbG9nNGpzLW5vZGUvbG9nNGpzLWFwaScpLmdldExvZ2dlcigncmVxdWlyZS1pbmplY3Rvci5yZXBsYWNlLXJlcXVpcmUnKTtcblxuLy8gYWNvcm5qc3ggPSBhY29ybkltcEluamVjdChhY29ybik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVxdWlyZUluamVjdG9yIHtcbiAgZnJvbVBhY2thZ2UocGFja2FnZU5hbWU6IHN0cmluZyB8IHN0cmluZ1tdLCByZXNvbHZlT3B0PzogUmVzb2x2ZU9wdGlvbik6IEZhY3RvcnlNYXBJbnRlcmY7XG4gIGZyb21EaXIoZGlyOiBzdHJpbmcgfCBzdHJpbmdbXSk6IEZhY3RvcnlNYXBJbnRlcmY7XG4gIGZyb21Sb290KCk6IEZhY3RvcnlNYXBJbnRlcmY7XG4gIHRyYW5zZm9ybShmaWxlOiBzdHJpbmcpOiBUcmFuc2Zvcm07XG4gIGluamVjdFRvRmlsZShmaWxlUGF0aDogc3RyaW5nLCBjb2RlOiBzdHJpbmcsIGFzdD86IGFueSk6IHN0cmluZztcbiAgY2xlYW51cCgpOiB2b2lkO1xufVxuXG4vLyBmdW5jdGlvbiByZXBsYWNlKGNvZGU6IHN0cmluZywgZmFjdG9yeU1hcHM6IEZhY3RvcnlNYXBbXSwgZmlsZVBhcmFtOiBhbnksIGFzdDogYW55KSB7XG4vLyAgIHJldHVybiBuZXcgUmVwbGFjZVJlcXVpcmUoKS5yZXBsYWNlKGNvZGUsIGZhY3RvcnlNYXBzLCBmaWxlUGFyYW0sIGFzdCk7XG4vLyAgIC8vIHJldHVybiBSZXBsYWNlUmVxdWlyZS5wcm90b3R5cGUucmVwbGFjZS5hcHBseShuZXcgUmVwbGFjZVJlcXVpcmUoKSwgYXJndW1lbnRzKTtcbi8vIH1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVwbGFjZVJlcXVpcmUgZXh0ZW5kcyBJbmplY3RvciBpbXBsZW1lbnRzIFJlcXVpcmVJbmplY3RvciB7XG5cbiAgdHJhbnNmb3JtOiAoZmlsZTogc3RyaW5nKSA9PiBUcmFuc2Zvcm07XG4gIHByb3RlY3RlZCB0c1BhcnNlcjogVHlwZXNjcmlwdFBhcnNlcjtcbiAgLyoqXG5cdCAqIG9wdHMuZW5hYmxlRmFjdG9yeVBhcmFtRmlsZSBgdHJ1ZWAgaWYgeW91IG5lZWQgXCJmaWxlUGF0aFwiIGFzIHBhcmFtZXRlciBmb3IgLmZhY3RvcnkoZmFjdG9yeShmaWxlUGF0aCkgey4uLn0pXG5cdCAqIFx0dGhpcyB3aWxsIGV4cG9zZSBvcmlnaW5hbCBzb3VyY2UgZmlsZSBwYXRoIGluIGNvZGUsIGRlZmF1bHQgaXMgYGZhbHNlYC5cblx0ICovXG4gIGNvbnN0cnVjdG9yKG9wdHM/OiBJbmplY3Rvck9wdGlvbikge1xuICAgIHN1cGVyKG9wdHMpO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSZXBsYWNlUmVxdWlyZSkpIHtcbiAgICAgIHJldHVybiBuZXcgUmVwbGFjZVJlcXVpcmUob3B0cyk7XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHRoaXMudHNQYXJzZXIgPSBuZXcgVHlwZXNjcmlwdFBhcnNlcih0aGlzKTtcblxuICAgIHRoaXMudHJhbnNmb3JtID0gZnVuY3Rpb24oZmlsZTogc3RyaW5nKSB7XG4gICAgICBpZiAoIV8uZW5kc1dpdGgoZmlsZSwgJy5qcycpKSB7XG4gICAgICAgIHJldHVybiB0aHJvdWdoKCk7XG4gICAgICB9XG4gICAgICB2YXIgZGF0YSA9ICcnO1xuICAgICAgcmV0dXJuIHRocm91Z2god3JpdGUsIGVuZCk7XG5cbiAgICAgIGZ1bmN0aW9uIHdyaXRlKGJ1Zjogc3RyaW5nLCBlbmM6IHN0cmluZywgbmV4dDogdGhyb3VnaC5UcmFuc2Zvcm1DYWxsYmFjaykge1xuICAgICAgICBkYXRhICs9IGJ1ZjsgbmV4dCgpO1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gZW5kKG5leHQ6IHRocm91Z2guVHJhbnNmb3JtQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5wdXNoKHNlbGYuaW5qZWN0VG9GaWxlKGZpbGUsIGRhdGEpKTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBjbGVhbnVwKCkge1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZXBsYWNlJyk7XG4gICAgc3VwZXIuY2xlYW51cCgpO1xuICB9XG4gIC8qKlxuXHQgKiBIZXJlIFwiaW5qZWN0XCIgaXMgYWN0dWFsbHkgXCJyZXBsYWNlbWVudFwiLlxuXHQgUGFyc2luZyBhIG1hdGNoZWQgZmlsZSB0byBBY29ybiBBU1QgdHJlZSwgbG9va2luZyBmb3IgbWF0Y2hlZCBgcmVxdWlyZShtb2R1bGUpYCBleHByZXNzaW9uIGFuZCByZXBsYWNpbmdcblx0ICB0aGVtIHdpdGggcHJvcGVyIHZhbHVlcywgZXhwcmVzc2lvbi5cblx0ICogQG5hbWUgaW5qZWN0VG9GaWxlXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gZmlsZVBhdGggZmlsZSBwYXRoXG5cdCAqIEBwYXJhbSAge3N0cmluZ30gY29kZSAgICAgY29udGVudCBvZiBmaWxlXG5cdCAqIEBwYXJhbSAge29iamVjdH0gYXN0ICAgICAgb3B0aW9uYWwsIGlmIHlvdSBoYXZlIGFscmVhZHkgcGFyc2VkIGNvZGUgdG8gQVNUIHRyZWUsIHBhc3MgaXQgdG8gdGhpcyBmdW5jdGlvbiB3aGljaFxuXHQgKiAgaGVscHMgdG8gc3BlZWQgdXAgcHJvY2VzcyBieSBza2lwIHBhcnNpbmcgYWdhaW4uXG5cdCAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgICAgcmVwbGFjZWQgc291cmNlIGNvZGUsIGlmIHRoZXJlIGlzIG5vIGluamVjdGFibGUgYHJlcXVpcmUoKWAsXG5cdCAqIFx0c2FtZSBzb3VyY2UgY29kZSB3aWxsIGJlIHJldHVybmVkLlxuXHQgKi9cbiAgaW5qZWN0VG9GaWxlKGZpbGVQYXRoOiBzdHJpbmcsIGNvZGU6IHN0cmluZywgYXN0PzogdHMuU291cmNlRmlsZSkge1xuICAgIHJldHVybiB0aGlzLmluamVjdFRvRmlsZVdpdGhQYXRjaEluZm8oZmlsZVBhdGgsIGNvZGUsIGFzdCkucmVwbGFjZWQ7XG4gIH1cblxuICAvKipcblx0ICogQHJldHVybiBwYXRjaCBpbmZvcm1hdGlvbiwgc28gdGhhdCBvdGhlciBwYXJzZXIgdG9vbCBjYW4gcmVzdWUgQVNUIGFuZCBcblx0ICogY2FsY3VsYXRlIHBvc2l0aW9uIHdpdGggdGhlc2UgcGF0Y2ggaW5mb3JtYXRpb25cblx0ICovXG4gIGluamVjdFRvRmlsZVdpdGhQYXRjaEluZm8oZmlsZVBhdGg6IHN0cmluZywgY29kZTogc3RyaW5nLCBhc3Q/OiB0cy5Tb3VyY2VGaWxlKTpcbiAge3JlcGxhY2VkOiBzdHJpbmcsIHBhdGNoZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgcmVwbGFjZW1lbnQ6IHN0cmluZ30+LCBhc3Q6IHRzLlNvdXJjZUZpbGV9IHtcbiAgICB2YXIgZmFjdG9yeU1hcHM6IEZhY3RvcnlNYXBbXXx1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGZhY3RvcnlNYXBzID0gdGhpcy5mYWN0b3J5TWFwc0ZvckZpbGUoZmlsZVBhdGgpO1xuICAgICAgaWYgKGZhY3RvcnlNYXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gaWYgKC9cXC50c3g/JC8udGVzdChmaWxlUGF0aCkpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy50c1BhcnNlci5yZXBsYWNlKGNvZGUsIGZhY3RvcnlNYXBzLCBmaWxlUGF0aCwgYXN0KTtcbiAgICAgICAgLy8gfSBlbHNlXG4gICAgICAgICAgLy8gcmVwbGFjZWQgPSB0aGlzLnJlcGxhY2UoY29kZSwgZmFjdG9yeU1hcHMsIGZpbGVQYXRoLCBhc3QpO1xuICAgICAgICBpZiAocmVzdWx0LnJlcGxhY2VkICE9IG51bGwpXG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyB7XG4gICAgICAgICAgICByZXBsYWNlZDogc3RyaW5nO1xuICAgICAgICAgICAgcGF0Y2hlczogQXJyYXk8e3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCByZXBsYWNlbWVudDogc3RyaW5nfT47XG4gICAgICAgICAgICBhc3Q6IHRzLlNvdXJjZUZpbGVcbiAgICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtyZXBsYWNlZDogY29kZSwgcGF0Y2hlczogW10sIGFzdDogdGhpcy50c1BhcnNlci5zcmNmaWxlfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2cuZXJyb3IoJ2ZpbGVQYXRoOiAnICsgZmlsZVBhdGgpO1xuICAgICAgaWYgKGZhY3RvcnlNYXBzICE9IG51bGwpXG4gICAgICAgIGxvZy5lcnJvcihfLm1hcChmYWN0b3J5TWFwcywgZmFjdG9yeU1hcCA9PiBmYWN0b3J5TWFwLnJlcXVpcmVNYXApLmpvaW4oKSk7XG4gICAgICBsb2cuZXJyb3IoZS5zdGFjayk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIGFkZFBhdGNoKHBhdGNoZXM6IFJlcGxhY2VtZW50SW5mW10sIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCBtb2R1bGVOYW1lOiBzdHJpbmcsXG4gICAgcmVwbGFjZVR5cGU6IFJlcGxhY2VUeXBlLCBmbWFwczogRmFjdG9yeU1hcFtdLCBmaWxlUGFyYW06IHN0cmluZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2V0dGluZztcbiAgICBmb3IgKGNvbnN0IGZhY3RvcnlNYXAgb2YgZm1hcHMpIHtcbiAgICAgIHNldHRpbmcgPSBmYWN0b3J5TWFwLm1hdGNoUmVxdWlyZShtb2R1bGVOYW1lKTtcbiAgICAgIGlmIChzZXR0aW5nKSB7XG4gICAgICAgIHZhciByZXBsYWNlbWVudCA9IGZhY3RvcnlNYXAuZ2V0UmVwbGFjZW1lbnQoc2V0dGluZywgcmVwbGFjZVR5cGUsIGZpbGVQYXJhbSk7XG4gICAgICAgIGlmIChyZXBsYWNlbWVudCAhPSBudWxsKSB7XG4gICAgICAgICAgcGF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICAgIHN0YXJ0LFxuICAgICAgICAgICAgZW5kLFxuICAgICAgICAgICAgcmVwbGFjZW1lbnQ6IHR5cGVvZiAocmVwbGFjZW1lbnQpID09PSAnc3RyaW5nJyA/XG4gICAgICAgICAgICAgIHJlcGxhY2VtZW50IGFzIHN0cmluZyA6IChyZXBsYWNlbWVudCBhcyBSZXBsYWNlZFJlc3VsdCkuY29kZVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHNlbGYuZW1pdCgncmVwbGFjZScsIG1vZHVsZU5hbWUsIHJlcGxhY2VtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQ29kZShjb2RlOiBzdHJpbmcpIHtcbi8vICAgdmFyIGFzdDtcbi8vICAgdmFyIGZpcnN0Q29tcGlsZUVyciA9IG51bGw7XG4vLyAgIHRyeSB7XG4vLyAgICAgYXN0ID0gYWNvcm5qc3gucGFyc2UoY29kZSwge2FsbG93SGFzaEJhbmc6IHRydWUsIHNvdXJjZVR5cGU6ICdtb2R1bGUnfSk7XG4vLyAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgIGZpcnN0Q29tcGlsZUVyciA9IGVycjtcbi8vICAgICB0cnkge1xuLy8gICAgICAgYXN0ID0gYWNvcm4ucGFyc2UoY29kZSwge2FsbG93SGFzaEJhbmc6IHRydWV9KTtcbi8vICAgICB9IGNhdGNoIChlcnIyKSB7XG4vLyAgICAgICBsb2cuZXJyb3IoJ1Bvc3NpYmxlIEVTIGNvbXBpbGF0aW9uIGVycm9yJywgZmlyc3RDb21waWxlRXJyKTtcbi8vICAgICAgIGZpcnN0Q29tcGlsZUVyci5tZXNzYWdlICs9ICdcXG5PciAnICsgZXJyMi5tZXNzYWdlO1xuLy8gICAgICAgZmlyc3RDb21waWxlRXJyLnN0YWNrICs9ICdcXG5Bbm90aGVyIHBvc3NpYmxlIGNvbXBpbGF0aW9uIGVycm9yIGlzXFxuJyArIGVycjIuc3RhY2s7XG4vLyAgICAgICB0aHJvdyBmaXJzdENvbXBpbGVFcnI7XG4vLyAgICAgfVxuLy8gICB9XG4vLyAgIHJldHVybiBhc3Q7XG4vLyB9XG4iXX0=