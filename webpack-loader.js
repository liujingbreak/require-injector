var _ = require('lodash');
//var Path = require('path');

// var injectFile = parseQuery(this.query).inject || 'webpack-inject.js';
// injectFile = Path.relative(this._compiler.options.context, injectFile).replace(/\\/g, '/');
// if (!_.startsWith(injectFile, '../'))
// 	injectFile += './';
// require(injectFile);

module.exports = function(content) {
	var callback = this.async();
	if (!callback)
		throw new Error('require-injector only supports async loader');
	loadAsync(content, this)
	.then(result => callback(null, result.content, null, result.ast))
	.catch(err => {
		console.error(err);
		callback(err);
	});
};

function load(content, loader) {
	var rj = loader.query.injector || require('.');
	var file = loader.resourcePath;
	var ast;
	rj.on('ast', onAstCompiled);

	content = rj.injectToFile(file, content);
	if (ast && _.isObject(loader.query.astCache))
		loader.query.astCache[loader.resourcePath] = ast;
	rj.removeListener('ast', onAstCompiled);
	function onAstCompiled(it) {
		ast = it;
	}
	return Promise.resolve({
		content: content,
		ast: ast
	});
}

function loadAsync(content, loader) {
	try {
		return Promise.resolve(load(content, loader));
	} catch (e) {
		console.error(e);
		return Promise.reject(e);
	}
}

