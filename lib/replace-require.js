//var rn = require('./register-node');
var patchText = require('./patch-text.js');
//var esprima = require('esprima');
var acorn = require('acorn');
var estraverse = require('estraverse');
var _ = require('lodash');
var through = require('through2');
var Injector = require('./node-inject');
var log = require('log4js').getLogger('require-injector.replace-require');
log.setLevel('INFO');
module.exports = ReplaceRequire;
module.exports.replace = replace;

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
	/**
	 * Here "inject" is actually "replacement".
	 Parsing a matched file to Acorn AST tree, looking for matched `require(module)` expression and replacing them with proper values, expression.
	 * @name injectToFile
	 * @param  {string} filePath file path
	 * @param  {string} code     content of file
	 * @param  {object} ast      optional, if you have already parsed code to AST tree with `{ranges: true}` option, pass it to this function which helps to speed up process by skip parsing again.
	 * @return {string}          replaced source code, if there is no injectable `require()`, same source code will be returned.
	 */
	injectToFile: function(filePath, code, ast) {
		var factoryMap;
		try {
			var dir = this.quickSearchDirByFile(filePath);

			if (dir) {
				factoryMap = this.injectionScopeMap[dir];
				var fileParam = this.config.enableFactoryParamFile ? filePath : null;
				return replace(code, factoryMap, fileParam, ast);
			}
			return code;
		} catch (e) {
			log.error('filePath: ' + filePath);
			log.error(factoryMap.requireMap);
			log.error(e.stack);
			throw e;
		}
	}
});

function replace(code, factoryMap, fileParam, ast) {
	if (!ast) {
		ast = parseCode(code);
	}

	var patches = [];
	estraverse.traverse(ast, {
		enter: function(node, parent) {
			if (node.type === 'CallExpression') {
				var calleeType = _.get(node, 'callee.type');
				if (calleeType === 'Identifier' && _.get(node, 'callee.name') === 'require') {
					onRequire(node, factoryMap, fileParam, patches);
				} else if (calleeType === 'MemberExpression' &&
					node.callee.object.name === 'require' &&
					node.callee.object.type === 'Identifier' &&
					node.callee.property.name === 'ensure' &&
					node.callee.property.type === 'Identifier') {
					onRequireEnsure(node, factoryMap, fileParam, patches);
				}
			}
		},
		leave: function(node, parent) {
		}
	});
	return patchText(code, patches);
}

function onRequire(node, factoryMap, fileParam, patches) {
	var calleeType = _.get(node, 'callee.type');
	if (calleeType === 'Identifier' &&
	_.get(node, 'callee.name') === 'require') {
		var old = _.get(node, 'arguments[0].value');
		addPatch(patches, node.range[0], node.range[1], old, 'rq', factoryMap, fileParam);
	}
}

function onRequireEnsure(node, factoryMap, fileParam, patches) {
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
			addPatch(patches, nameNode.range[0], nameNode.range[1], old, 'rs', factoryMap, fileParam);
		});
	} else if (args[0].type === 'Literal') {
		var old = _.get(node, 'arguments[0].value');
		addPatch(patches, args[0].range[0], args[0].range[1], old, 'rs', factoryMap, fileParam);
	}
}

function addPatch(patches, start, end, moduleName, astType, factoryMap, fileParam) {
	var setting = factoryMap.matchRequire(moduleName);
	if (setting) {
		var replacement = factoryMap.getReplacement(setting, astType, fileParam);
		if (replacement != null) {
			patches.push({
				start: start,
				end: end,
				replacement: replacement
			});
		}
	}
}

function parseCode(code) {
	//return esprima.parse(code, {range: true, loc: false});
	return acorn.parse(code, {ranges: true});
}
