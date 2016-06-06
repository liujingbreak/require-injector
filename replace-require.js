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

function injectToFile(filePath, code, ast) {
	var dir = rn.quickSearchDirByFile(filePath);
	if (dir) {
		var factoryMap = rn.injectionScopeMap[dir];
		var replacement = {};
		_.each(factoryMap.requireMap, function(injector, name) {
			if (_.has(injector, 'factory')) {
				replacement[name] = injector.factory.toString();
			} else if (_.has(injector, 'substitute')) {
				replacement[name] = 'require(\'' + injector.substitute + '\')';
			} else if (_.has(injector, 'value')) {
				replacement[name] = JSON.stringify(injector.value);
			}
		});
		return replace(code, replacement, ast);
	}
	return code;
}