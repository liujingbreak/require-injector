module.exports = require('./register-node');
var replace = require('./replace-require');
module.exports.replace = replace;
module.exports.transform = replace.transform;
module.exports.injectToFile = replace.injectToFile;
