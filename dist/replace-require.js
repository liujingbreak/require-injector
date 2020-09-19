"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const factory_map_1 = require("./factory-map");
const node_inject_1 = tslib_1.__importDefault(require("./node-inject"));
const _ = tslib_1.__importStar(require("lodash"));
// const dynamicImport = require('acorn-dynamic-import').default;
// var estraverse = require('estraverse-fb');
// const jsx = require('acorn-jsx');
// let acornjsx = acorn.Parser.extend(jsx());
// acornjsx.extend(dynamicImport);
const through = require("through2");
const parse_esnext_import_1 = require("./parse-esnext-import");
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
    /**
       * @return null if there is no change
       */
    // private replace(code: string, fm: FactoryMap | FactoryMap[], fileParam: string, ast?: any) {
    //   const factoryMaps = ([] as FactoryMap[]).concat(fm);
    //   var self = this;
    //   if (!ast) {
    //     ast = parseCode(code);
    //     self.emit('ast', ast);
    //   }
    //   var patches: ReplacementInf[] = [];
    //   estraverse.traverse(ast, {
    //     enter(node: any, parent: any) {
    //       if (node.type === 'CallExpression') {
    //         var calleeType = _.get(node, 'callee.type');
    //         var callee = node.callee;
    //         if (calleeType === 'Import') {
    //           self.onImportAsync(node, factoryMaps, fileParam, patches);
    //         }
    //         if (calleeType === 'Identifier') {
    //           var funcName = _.get(node, 'callee.name');
    //           if (funcName === 'require')
    //             self.onRequire(node, factoryMaps, fileParam, patches);
    //           else if (funcName === 'import')
    //             self.onImportAsync(node, factoryMaps, fileParam, patches);
    //         } else if (calleeType === 'MemberExpression' &&
    //           callee.object.name === 'require' &&
    //           callee.object.type === 'Identifier' &&
    //           callee.property.name === 'ensure' &&
    //           callee.property.type === 'Identifier') {
    //           self.onRequireEnsure(node, factoryMaps, fileParam, patches);
    //         }
    //       } else if (node.type === 'ImportDeclaration') {
    //         self.onImport(node, factoryMaps, fileParam, patches);
    //       } else if ((node.type === 'ExportNamedDeclaration' && node.source) ||
    //         (node.type === 'ExportAllDeclaration' && node.source)) {
    //         // self.onExport(node, factoryMaps, fileParam, patches);
    //         // TODO: support `export ... from ...`
    //       }
    //     },
    //     leave(node: any, parent: any) {
    //     },
    //     keys: {
    //       Import: [], JSXText: []
    //     }
    //   });
    //   if (patches.length > 0)
    //     return patchText(code, patches);
    //   else
    //     return null;
    // }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1yZXF1aXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvcmVwbGFjZS1yZXF1aXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUlBLCtDQUF3RjtBQUN4Rix3RUFBc0U7QUFDdEUsa0RBQTRCO0FBQzVCLGlFQUFpRTtBQUNqRSw2Q0FBNkM7QUFDN0Msb0NBQW9DO0FBQ3BDLDZDQUE2QztBQUM3QyxrQ0FBa0M7QUFFbEMsb0NBQXFDO0FBQ3JDLCtEQUEyRTtBQUMzRSx1REFBbUQ7QUFFbkQsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUMsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7QUFhM0Ysd0ZBQXdGO0FBQ3hGLDRFQUE0RTtBQUM1RSx1RkFBdUY7QUFDdkYsSUFBSTtBQUVKLE1BQXFCLGNBQWUsU0FBUSxxQkFBUTtJQUlsRDs7O1NBR0U7SUFDRixZQUFZLElBQXFCO1FBQy9CLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNaLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxjQUFjLENBQUMsRUFBRTtZQUNyQyxPQUFPLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2pDO1FBQ0QsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWhCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxrQ0FBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUzQyxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVMsSUFBWTtZQUNwQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQzVCLE9BQU8sT0FBTyxFQUFFLENBQUM7YUFDbEI7WUFDRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7WUFDZCxPQUFPLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFM0IsU0FBUyxLQUFLLENBQUMsR0FBVyxFQUFFLEdBQVcsRUFB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