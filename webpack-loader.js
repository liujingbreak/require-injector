var log = require('log4js').getLogger('require-injector.loader');
var _ = require('lodash');
var parseCode = require('./lib/replace-require');
//var Path = require('path');

// var injectFile = parseQuery(this.query).inject || 'webpack-inject.js';
// injectFile = Path.relative(this._compiler.options.context, injectFile).replace(/\\/g, '/');
// if (!_.startsWith(injectFile, '../'))
// 	injectFile += './';
// require(injectFile);

module.exports = function(content) {
	var callback = this.async();
	if (!callback)
		return load(content, this);
	loadAsync(content, this)
	.then(result => callback(null, result))
	.catch(err => callback(err));
};

function load(content, loader) {
	var rj = loader.query.injector || require('.');
	var file = loader.resourcePath;
	//var output = Path.relative(loader._compiler.options.context || process.cwd(), file);
	var ast = parseCode(content);
	content = rj.injectToFile(file, content, ast);
	return content;
}

function loadAsync(content, loader) {
	try {
		return Promise.resolve(load(content, loader));
	} catch (e) {
		log.error(e);
		return Promise.reject(e);
	}
}

