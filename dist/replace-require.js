"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const patch_text_1 = tslib_1.__importDefault(require("./patch-text"));
const factory_map_1 = require("./factory-map");
const node_inject_1 = tslib_1.__importDefault(require("./node-inject"));
const _ = tslib_1.__importStar(require("lodash"));
// var acorn = require('acorn');
const acorn = tslib_1.__importStar(require("acorn"));
// import acorn = require('acorn');
const dynamicImport = require('acorn-dynamic-import').default;
// import jsx from 'acorn-jsx';
var estraverse = require('estraverse-fb');
const jsx = require('acorn-jsx');
let acornjsx = acorn.Parser.extend(jsx());
acornjsx.extend(dynamicImport);
const through = require("through2");
var { parse: parseEs6Import, parseExport } = require('../dist/parse-esnext-import');
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
        var info = parseEs6Import(node);
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
        var info = parseExport(node);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1yZXF1aXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcmVwbGFjZS1yZXF1aXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHNFQUF1RDtBQUN2RCwrQ0FBd0Y7QUFDeEYsd0VBQXNFO0FBQ3RFLGtEQUE0QjtBQUM1QixnQ0FBZ0M7QUFDaEMscURBQStCO0FBQy9CLG1DQUFtQztBQUNuQyxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDOUQsK0JBQStCO0FBQy9CLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUMxQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDakMsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUMxQyxRQUFRLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRS9CLG9DQUFxQztBQUNyQyxJQUFJLEVBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUMsR0FBRyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUNsRix1REFBbUQ7QUFFbkQsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUMsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7QUFZM0YsU0FBZ0IsT0FBTyxDQUFDLElBQVksRUFBRSxXQUF5QixFQUFFLFNBQWMsRUFBRSxHQUFRO0lBQ3hGLE9BQU8sSUFBSSxjQUFjLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdkUsa0ZBQWtGO0FBQ25GLENBQUM7QUFIRCwwQkFHQztBQUNELE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztBQUVyQyxNQUFx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