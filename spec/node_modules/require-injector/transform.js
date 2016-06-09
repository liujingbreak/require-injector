var Path = require('path');
var rj = require('./index');

module.exports = function(file, opts) {
	if (!opts.hasOwnProperty('inject')) {
		throw new Error('require-injector/transform requires "injector" file as transform option');
	}
	require(Path.resolve(opts.inject).replace(/\\/g, '/'));
	return rj.getInstance().transform.call(rj.getInstance(), file);
};
