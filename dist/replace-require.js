"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const patch_text_1 = tslib_1.__importDefault(require("./patch-text"));
const factory_map_1 = require("./factory-map");
const node_inject_1 = tslib_1.__importDefault(require("./node-inject"));
const _ = tslib_1.__importStar(require("lodash"));
const acorn = tslib_1.__importStar(require("acorn"));
const dynamicImport = require('acorn-dynamic-import').default;
var estraverse = require('estraverse-fb');
const jsx = require('acorn-jsx');
let acornjsx = acorn.Parser.extend(jsx());
acornjsx.extend(dynamicImport);
const through = require("through2");
const parse_esnext_import_1 = require("./parse-esnext-import");
const parse_ts_import_1 = require("./parse-ts-import");
var log = require('@log4js-node/log4js-api').getLogger('require-injector.replace-require');
function replace(code, factoryMaps, fileParam, ast) {
    return new ReplaceRequire().replace(code, factoryMaps, fileParam, ast);
    // return ReplaceRequire.prototype.replace.apply(new ReplaceRequire(), arguments);
}
exports.replace = replace;
module.exports.parseCode = parseCode;
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
    /**
     * @return null if there is no change
     */
    replace(code, fm, fileParam, ast) {
        const factoryMaps = [].concat(fm);
        var self = this;
        if (!ast) {
            ast = parseCode(code);
            self.emit('ast', ast);
        }
        var patches = [];
        estraverse.traverse(ast, {
            enter(node, parent) {
                if (node.type === 'CallExpression') {
                    var calleeType = _.get(node, 'callee.type');
                    var callee = node.callee;
                    if (calleeType === 'Import') {
                        self.onImportAsync(node, factoryMaps, fileParam, patches);
                    }
                    if (calleeType === 'Identifier') {
                        var funcName = _.get(node, 'callee.name');
                        if (funcName === 'require')
                            self.onRequire(node, factoryMaps, fileParam, patches);
                        else if (funcName === 'import')
                            self.onImportAsync(node, factoryMaps, fileParam, patches);
                    }
                    else if (calleeType === 'MemberExpression' &&
                        callee.object.name === 'require' &&
                        callee.object.type === 'Identifier' &&
                        callee.property.name === 'ensure' &&
                        callee.property.type === 'Identifier') {
                        self.onRequireEnsure(node, factoryMaps, fileParam, patches);
                    }
                }
                else if (node.type === 'ImportDeclaration') {
                    self.onImport(node, factoryMaps, fileParam, patches);
                }
                else if ((node.type === 'ExportNamedDeclaration' && node.source) ||
                    (node.type === 'ExportAllDeclaration' && node.source)) {
                    // self.onExport(node, factoryMaps, fileParam, patches);
                    // TODO: support `export ... from ...`
                }
            },
            leave(node, parent) {
            },
            keys: {
                Import: [], JSXText: []
            }
        });
        if (patches.length > 0)
            return patch_text_1.default(code, patches);
        else
            return null;
    }
    onImport(node, factoryMaps, fileParam, patches) {
        var info = parse_esnext_import_1.parse(node);
        var self = this;
        _.some(factoryMaps, factoryMap => {
            var setting = factoryMap.matchRequire(info.from);
            if (setting) {
                var replacement = factoryMap.getReplacement(setting, factory_map_1.ReplaceType.imp, fileParam, info);
                if (replacement != null) {
                    patches.push({
                        start: replacement.replaceAll ? node.start : node.source.start,
                        end: replacement.replaceAll ? node.end : node.source.end,
                        replacement: replacement.code
                    });
                    self.emit('replace', info.from, replacement.code);
                }
                return true;
            }
            return false;
        });
    }
    onExport(node, factoryMaps, fileParam, patches) {
        var info = parse_esnext_import_1.parseExport(node);
        var self = this;
        _.some(factoryMaps, factoryMap => {
            var setting = factoryMap.matchRequire(info.from);
            if (setting) {
                var replacement = factoryMap.getReplacement(setting, factory_map_1.ReplaceType.imp, fileParam, info);
                if (replacement != null) {
                    patches.push({
                        start: replacement.replaceAll ? node.start : node.source.start,
                        end: replacement.replaceAll ? node.end : node.source.end,
                        replacement: replacement.code
                    });
                    self.emit('replace', info.from, replacement.code);
                }
                return true;
            }
            return false;
        });
    }
    onImportAsync(node, factoryMaps, fileParam, patches) {
        var old = _.get(node, 'arguments[0].value');
        this.addPatch(patches, node.start, node.end, old, factory_map_1.ReplaceType.ima, factoryMaps, fileParam);
    }
    onRequire(node, factoryMaps, fileParam, patches) {
        var calleeType = _.get(node, 'callee.type');
        if (calleeType === 'Identifier' &&
            _.get(node, 'callee.name') === 'require') {
            var old = _.get(node, 'arguments[0].value');
            this.addPatch(patches, node.start, node.end, old, factory_map_1.ReplaceType.rq, factoryMaps, fileParam);
        }
    }
    onRequireEnsure(node, factoryMaps, fileParam, patches) {
        var self = this;
        var args = node.arguments;
        if (args.length === 0) {
            return;
        }
        if (args[0].type === 'ArrayExpression') {
            args[0].elements.forEach((nameNode) => {
                if (nameNode.type !== 'Literal') {
                    log.error('require.ensure() should be called with String literal');
                    return;
                }
                var old = nameNode.value;
                self.addPatch(patches, nameNode.start, nameNode.end, old, factory_map_1.ReplaceType.rs, factoryMaps, fileParam);
            });
        }
        else if (args[0].type === 'Literal') {
            var old = _.get(node, 'arguments[0].value');
            self.addPatch(patches, args[0].start, args[0].end, old, factory_map_1.ReplaceType.rs, factoryMaps, fileParam);
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
function parseCode(code) {
    var ast;
    var firstCompileErr = null;
    try {
        ast = acornjsx.parse(code, { allowHashBang: true, sourceType: 'module' });
    }
    catch (err) {
        firstCompileErr = err;
        try {
            ast = acorn.parse(code, { allowHashBang: true });
        }
        catch (err2) {
            log.error('Possible ES compilation error', firstCompileErr);
            firstCompileErr.message += '\nOr ' + err2.message;
            firstCompileErr.stack += '\nAnother possible compilation error is\n' + err2.stack;
            throw firstCompileErr;
        }
    }
    return ast;
}
exports.parseCode = parseCode;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1yZXF1aXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcmVwbGFjZS1yZXF1aXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHNFQUF1RDtBQUN2RCwrQ0FBd0Y7QUFDeEYsd0VBQXNFO0FBQ3RFLGtEQUE0QjtBQUM1QixxREFBK0I7QUFDL0IsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzlELElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUMxQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDakMsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUMxQyxRQUFRLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRS9CLG9DQUFxQztBQUNyQywrREFBMkU7QUFDM0UsdURBQW1EO0FBRW5ELElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBWTNGLFNBQWdCLE9BQU8sQ0FBQyxJQUFZLEVBQUUsV0FBeUIsRUFBRSxTQUFjLEVBQUUsR0FBUTtJQUN4RixPQUFPLElBQUksY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZFLGtGQUFrRjtBQUNuRixDQUFDO0FBSEQsMEJBR0M7QUFDRCxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7QUFFckMsTUFBcUIsY0FBZSxTQUFRLHFCQUFRO0lBSW5EOzs7T0FHRztJQUNILFlBQVksSUFBcUI7UUFDaEMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLENBQUMsSUFBSSxZ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