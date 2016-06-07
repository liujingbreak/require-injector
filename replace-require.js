var rn = require('./register-node');
var patchText = require('patch-text');
var esprima = require('esprima');
var estraverse = require('estraverse');
var _ = require('lodash');
var through = require('through2');

module.exports = replace;
module.exports.transform = browserifyTransform;
module.exports.injectToFile = injectToFile;

function replace(code, replacement, ast) {
	if (!ast) {
		ast = parseCode(code);
	}

	var patches = [];
	estraverse.traverse(ast, {
		enter: function(node, parent) {
			if (node.type === 'CallExpression' &&
			_.get(node, 'callee.type') === 'Identifier' &&
			_.get(node, 'callee.name') === 'require') {
				var required = _.get(node, 'arguments[0].value');
				if (_.has(replacement, required)) {
					var replaced = replacement[required];
					console.log('replace require (' + required + ') to ' + replaced);
					patches.push({
						start: node.range[0],
						end: node.range[1],
						replacement: replaced
					});
				}
			}
		},
		leave: function(node, parent) {
		}
	});

	return patchText(code, patches);
}

function parseCode(code) {
	return esprima.parse(code, {range: true, loc: false});
}

function browserifyTransform(file) {
	if (!_.endsWith(file, '.js')) {
		return through();
	}
	var data = '';
	return through(write, end);

	function write(buf, enc, next) {
		data += buf; next();
	}
	function end(next) {
		this.push(injectToFile(file, data));
		next();
	}
}

/**
 * Here "inject" is actually "replacement".
 Parsing a matched file to Esprima AST tree, looking for matched `require(module)` expression and replacing them with proper values, expression.
 * @name injectToFile
 * @param  {string} filePath file path
 * @param  {string} code     content of file
 * @param  {object} ast      optional, if you have already parsed code to[esrima](https://www.npmjs.com/package/esprima) AST tree with `{range: true}` option, pass it to this function which helps to speed up process by skip parsing again.
 * @return {string}          replaced source code, if there is no injectable `require()`, same source code will be returned.
 */
function injectToFile(filePath, code, ast) {
	var dir = rn.quickSearchDirByFile(filePath);
	if (dir) {
		var factoryMap = rn.injectionScopeMap[dir];
		var replacement = {};
		_.each(factoryMap.requireMap, function(injector, name) {
			if (_.has(injector, 'factory')) {
				replacement[name] = '(' + injector.factory.toString() + ')()';
			} else if (_.has(injector, 'substitute')) {
				replacement[name] = 'require(\'' + injector.substitute + '\')';
			} else if (_.has(injector, 'value')) {
				if (_.has(injector.value, 'replacement')) {
					replacement[name] = injector.value.replacement;
				} else {
					replacement[name] = JSON.stringify(injector.value);
				}
			} else if (_.has(injector, 'variable')) {
				replacement[name] = injector.variable;
			}
		});
		return replace(code, replacement, ast);
	}
	return code;
}
