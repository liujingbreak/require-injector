//var rn = require('./register-node');
var patchText = require('./patch-text.js');
//var esprima = require('esprima');
var acorn = require('acorn');
var estraverse = require('estraverse-fb');
var acornjsx = require('acorn-jsx/inject')(acorn);
var acornImpInject = require('acorn-dynamic-import/lib/inject').default;
var _ = require('lodash');
var through = require('through2');
var Injector = require('./node-inject');
var {parse: parseEs6Import} = require('../dist/parse-esnext-import');

var log = require('@log4js-node/log4js-api').getLogger('require-injector.replace-require');

acornjsx = acornImpInject(acornjsx);
module.exports = ReplaceRequire;
module.exports.replace = function(code, factoryMaps, fileParam, ast) {
	return ReplaceRequire.prototype.replace.apply(new ReplaceRequire(), arguments);
};
module.exports.parseCode = parseCode;

/**
 * opts.enableFactoryParamFile `true` if you need "filePath" as parameter for .factory(factory(filePath) {...})
 * 	this will expose original source file path in code, default is `false`.
 */
function ReplaceRequire(opts) {
	if (!(this instanceof ReplaceRequire)) {
		return new ReplaceRequire(opts);
	}
	Injector.apply(this, arguments);
	var self = this;

	this.transform = function(file) {
		if (!_.endsWith(file, '.js')) {
			return through();
		}
		var data = '';
		return through(write, end);

		function write(buf, enc, next) {
			data += buf; next();
		}
		function end(next) {
			this.push(self.injectToFile(file, data));
			next();
		}
	};
}

ReplaceRequire.prototype = _.create(Injector.prototype, {
	cleanup: function() {
		this.removeAllListeners('replace');
		Injector.cleanup.apply(this, arguments);
	},
	/**
	 * Here "inject" is actually "replacement".
	 Parsing a matched file to Acorn AST tree, looking for matched `require(module)` expression and replacing them with proper values, expression.
	 * @name injectToFile
	 * @param  {string} filePath file path
	 * @param  {string} code     content of file
	 * @param  {object} ast      optional, if you have already parsed code to AST tree, pass it to this function which helps to speed up process by skip parsing again.
	 * @return {string}          replaced source code, if there is no injectable `require()`, same source code will be returned.
	 */
	injectToFile: function(filePath, code, ast) {
		var factoryMaps;
		try {
			factoryMaps = this.factoryMapsForFile(filePath);
			if (factoryMaps.length > 0) {
				//var fileParam = this.config.enableFactoryParamFile ? filePath : null;
				return this.replace(code, factoryMaps, filePath, ast);
			}
			return code;
		} catch (e) {
			log.error('filePath: ' + filePath);
			log.error(_.map(factoryMaps, factoryMap => factoryMap.requireMap).join());
			log.error(e.stack);
			throw e;
		}
	},

	replace: function(code, factoryMaps, fileParam, ast) {
		factoryMaps = [].concat(factoryMaps);
		var self = this;
		if (!ast) {
			ast = parseCode(code);
			self.emit('ast', ast);
		}

		var patches = [];

		estraverse.traverse(ast, {
			enter: function(node, parent) {
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
					} else if (calleeType === 'MemberExpression' &&
						callee.object.name === 'require' &&
						callee.object.type === 'Identifier' &&
						callee.property.name === 'ensure' &&
						callee.property.type === 'Identifier') {
						self.onRequireEnsure(node, factoryMaps, fileParam, patches);
					}
				} else if (node.type === 'ImportDeclaration') {
					self.onImport(node, factoryMaps, fileParam, patches);
				}
			},
			leave: function(node, parent) {
			},
			keys: {
				Import: [], JSXText: []
			}
		});
		return patchText(code, patches);
	},

	onImport: function(node, factoryMaps, fileParam, patches) {
		var info = parseEs6Import(node);
		var self = this;
		_.some(factoryMaps, factoryMap => {
			var setting = factoryMap.matchRequire(info.from);
			if (setting) {
				var replacement = factoryMap.getReplacement(setting, 'imp', fileParam, info);
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
	},

	onImportAsync: function(node, factoryMaps, fileParam, patches) {
		var old = _.get(node, 'arguments[0].value');
		this.addPatch(patches, node.start, node.end, old, 'ima', factoryMaps, fileParam);
	},

	onRequire: function(node, factoryMaps, fileParam, patches) {
		var calleeType = _.get(node, 'callee.type');
		if (calleeType === 'Identifier' &&
		_.get(node, 'callee.name') === 'require') {
			var old = _.get(node, 'arguments[0].value');
			this.addPatch(patches, node.start, node.end, old, 'rq', factoryMaps, fileParam);
		}
	},

	onRequireEnsure: function(node, factoryMaps, fileParam, patches) {
		var self = this;
		var args = node.arguments;
		if (args.length === 0) {
			return;
		}
		if (args[0].type === 'ArrayExpression') {
			args[0].elements.forEach(nameNode => {
				if (nameNode.type !== 'Literal') {
					log.error('require.ensure() should be called with String literal');
					return;
				}
				var old = nameNode.value;
				self.addPatch(patches, nameNode.start, nameNode.end, old, 'rs', factoryMaps, fileParam);
			});
		} else if (args[0].type === 'Literal') {
			var old = _.get(node, 'arguments[0].value');
			self.addPatch(patches, args[0].start, args[0].end, old, 'rs', factoryMaps, fileParam);
		}
	},

	addPatch: function(patches, start, end, moduleName, astType, fmaps, fileParam) {
		var self = this;
		var setting;
		_.some(fmaps, factoryMap => {
			setting = factoryMap.matchRequire(moduleName);
			if (setting) {
				var replacement = factoryMap.getReplacement(setting, astType, fileParam);
				if (replacement != null) {
					patches.push({
						start: start,
						end: end,
						replacement: replacement
					});
					self.emit('replace', moduleName, replacement);
				}
				return true;
			}
			return false;
		});
	}
});

function parseCode(code) {
	//return esprima.parse(code, {range: true, loc: false});
	var ast;
	try {
		ast = acornjsx.parse(code, {allowHashBang: true, sourceType: 'module', plugins: {jsx: true, dynamicImport: true}});
	} catch (err) {
		ast = acornjsx.parse(code, {allowHashBang: true, plugins: {jsx: true, dynamicImport: true}});
	}
	return ast;
}
