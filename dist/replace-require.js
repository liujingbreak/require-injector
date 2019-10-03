"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_inject_1 = tslib_1.__importDefault(require("./node-inject"));
const _ = tslib_1.__importStar(require("lodash"));
const through = require("through2");
const parse_ts_import_1 = require("./parse-ts-import");
var log = require('@log4js-node/log4js-api').getLogger('require-injector.replace-require');
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
        var factoryMaps;
        try {
            factoryMaps = this.factoryMapsForFile(filePath);
            var replaced = null;
            if (factoryMaps.length > 0) {
                // if (/\.tsx?$/.test(filePath)) {
                replaced = this.tsParser.replace(code, factoryMaps, filePath, ast);
                // } else
                // replaced = this.replace(code, factoryMaps, filePath, ast);
                if (replaced != null)
                    return replaced;
            }
            return code;
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
                        replacement: typeof (replacement) === 'string' ? replacement : replacement.code
                    });
                    self.emit('replace', moduleName, replacement);
                }
                break;
            }
        }
    }
}
exports.default = ReplaceRequire;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1yZXF1aXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcmVwbGFjZS1yZXF1aXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLHdFQUFzRTtBQUN0RSxrREFBNEI7QUFJNUIsb0NBQXFDO0FBQ3JDLHVEQUFtRDtBQUVuRCxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQVczRixNQUFxQixjQUFlLFNBQVEscUJBQVE7SUFJbkQ7OztPQUdHO0lBQ0gsWUFBWSxJQUFxQjtRQUNoQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDWixJQUFJLENBQUMsQ0FBQyxJQUFJLFlBQVksY0FBYyxDQUFDLEVBQUU7WUFDdEMsT0FBTyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNoQztRQUNELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztRQUVoQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksa0NBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxVQUFTLElBQVk7WUFDckMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUM3QixPQUFPLE9BQU8sRUFBRSxDQUFDO2FBQ2pCO1lBQ0QsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2QsT0FBTyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRTNCLFNBQVMsS0FBSyxDQUFDLEdBQVcsRUFBRSxHQUFXLEVBQUUsSUFBK0I7Z0JBQ3ZFLElBQUksSUFBSSxHQUFHLENBQUM7Z0JBQUMsSUFBSSxFQUFFLENBQUM7WUFDckIsQ0FBQztZQUNELFNBQVMsR0FBRyxDQUFDLElBQStCO2dCQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMs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