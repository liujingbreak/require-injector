var rj = require('require-injector')({basedir: __dirname})
.fromDir('dir1')
	.value('aaa', 'hellow')
	.value('bbb', 'world');
