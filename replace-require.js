//var rn = require('./register-node');
var patchText = require('./patch-text.js');
var esprima = require('esprima');
var estraverse = require('estraverse');
var _ = require('lodash');
var through = require('through2');
var Injector = require('./node-inject');
var log = require('log4js').getLogger('require-injector.replace-require');

module.exports = ReplaceRequire;
module.exports.replace = replace;

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
	 Parsing a matched file to Esprima AST tree, looking for matched `require(module)` expression and replacing them with proper values, expression.
	 * @name injectToFile
	 * @param  {string} filePath file path
	 * @param  {string} code     content of file
	 * @param  {object} ast      optional, if you have already parsed code to[esrima](https://www.npmjs.com/package/esprima) AST tree with `{range: true}` option, pass it to this function which helps to speed up process by skip parsing again.
	 * @return {string}          replaced source code, if there is no injectable `require()`, same source code will be returned.
	 */
	injectToFile: function(filePath, code, ast) {
		var factoryMap;
		try {
			var dir = this.quickSearchDirByFile(filePath);

			if (dir) {
				factoryMap = this.injectionScopeMap[dir];
				var replacement = {};

				_.each(factoryMap.requireMap, function(injector, name) {
					if (_.has(injector, 'factory')) {
						defineLazyProp(replacement, name, function() {
							return {
								rq: '(' + injector.factory.toString() + ')(\'' + filePath + '\')'
							};
						});
					} else if (_.has(injector, 'substitute')) {
						defineLazyProp(replacement, name, function() {
							return {
								rs: '\'' + injector.substitute + '\'',
								rq: 'require(\'' + injector.substitute + '\')'
							};
						});
					} else if (_.has(injector, 'value')) {
						if (_.has(injector.value, 'replacement')) {
							defineLazyProp(replacement, name, function() {
								return {rq: injector.value.replacement};
							});
						} else {
							defineLazyProp(replacement, name, function() {
								return {rq: JSON.stringify(injector.value)};
							});
						}
					} else if (_.has(injector, 'variable')) {
						defineLazyProp(replacement, name, function() {
							return {rq: injector.variable};
						});
					}
				});
				return replace(code, replacement, ast);
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

function defineLazyProp(obj, name, get) {
	Object.defineProperty(obj, name, {
		enumerable: true,
		get: get
	});
}

function replace(code, replacement, ast) {
	if (!ast) {
		ast = parseCode(code);
	}

	var patches = [];
	estraverse.traverse(ast, {
		enter: function(node, parent) {
			if (node.type === 'CallExpression') {
				var calleeType = _.get(node, 'callee.type');
				if (calleeType === 'Identifier' && _.get(node, 'callee.name') === 'require') {
					onRequire(node, replacement, patches);
				} else if (calleeType === 'MemberExpression' &&
					node.callee.object.name === 'require' &&
					node.callee.object.type === 'Identifier' &&
					node.callee.property.name === 'ensure' &&
					node.callee.property.type === 'Identifier') {
					onRequireEnsure(node, replacement, patches);
				}
			}
		},
		leave: function(node, parent) {
		}
	});
	return patchText(code, patches);
}

function onRequire(node, replacement, patches) {
	var calleeType = _.get(node, 'callee.type');
	if (calleeType === 'Identifier' &&
	_.get(node, 'callee.name') === 'require') {
		var old = _.get(node, 'arguments[0].value');
		if (_.has(replacement, old)) {
			//console.log('replace require (' + required + ') to ' + replaced);
			patches.push({
				start: node.range[0],
				end: node.range[1],
				replacement: _.isString(replacement[old]) ? replacement[old] : replacement[old].rq
			});
		}
	}
}

function onRequireEnsure(node, replacement, patches) {
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
			if (_.has(replacement, old) && _.has(replacement[old], 'rs')) {
				patches.push({
					start: nameNode.range[0],
					end: nameNode.range[1],
					replacement: replacement[old].rs
				});
			}
		});
	} else if (args[0].type === 'Literal') {
		var old = _.get(node, 'arguments[0].value');
		if (_.has(replacement, old) && _.has(replacement[old], 'rs')) {
			patches.push({
				start: args[0].range[0],
				end: args[0].range[1],
				replacement: replacement[old].rs
			});
		}
	}
}

function parseCode(code) {
	return esprima.parse(code, {range: true, loc: false});
}
