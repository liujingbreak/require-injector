var log = require('log4js').getLogger('require-injector.loader');
var _ = require('lodash');
var Path = require('path');

var rj = require('.');

var injectFile = parseQuery(this.query).inject || 'webpack-inject.js';
injectFile = Path.relative(this._compiler.options.context, injectFile).replace(/\\/g, '/');
if (!_.startsWith(injectFile, '../'))
	injectFile += './';
require(injectFile);

module.exports = function(content) {
	var callback = this.async();
	if (!callback)
		return load(content, this);
	loadAsync(content, this)
	.then(result => callback(null, result))
	.catch(err => callback(err));
};

function load(content, loader) {
	var file = loader.resourcePath;
	var output = Path.relative(loader._compiler.options.context || process.cwd(), file);
	log.info('add entry html %s', output);
	if (!loader._compilation._lego_entry)
		loader._compilation._lego_entry = {};
	loader._compilation._lego_entry[output] = content;
	//loader.emitFile(output, loader._compiler.inputFileSystem.readFileSync(file, 'utf8'));
	return 'module.exports = null';
}

function loadAsync(content, loader) {
	return Promise.resolve(load(content, loader));
}

module.exports.parseQuery = parseQuery;
function parseQuery(q) {
	if (!q)
		return {};
	var keyValue = {};
	if (_.startsWith(q, '?'))
		q = q.substring(1);
	var pairs = q.split('&');
	pairs.forEach(function(pair) {
		var kv = pair.split('=');
		keyValue[kv[0]] = kv[1];
	});
	return keyValue;
}
