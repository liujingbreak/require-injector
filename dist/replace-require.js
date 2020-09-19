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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1yZXF1aXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcmVwbGFjZS1yZXF1aXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLHdFQUFzRTtBQUN0RSxrREFBNEI7QUFDNUIsb0NBQXFDO0FBQ3JDLHVEQUFtRDtBQUVuRCxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQWEzRix3RkFBd0Y7QUFDeEYsNEVBQTRFO0FBQzVFLHVGQUF1RjtBQUN2RixJQUFJO0FBRUosTUFBcUIsY0FBZSxTQUFRLHFCQUFRO0lBSWxEOzs7U0FHRTtJQUNGLFlBQVksSUFBcUI7UUFDL0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLGNBQWMsQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakM7UUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFFaEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGtDQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTNDLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBUyxJQUFZO1lBQ3BDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDNUIsT0FBTyxPQUFPLEVBQUUsQ0FBQzthQUNsQjtZQUNELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUUzQixTQUFTLEtBQUssQ0FBQyxHQUFXLEVBQUUsR0FBVyxFQUFFLElBQStCO2dCQUN0RSxJQUFJLElBQUksR0FBRyxDQUFDO2dCQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RCLENBQUM7WUFDRCxTQUFTLEdBQUcsQ0FBQyxJQUEr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