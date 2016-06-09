var shell = require('shelljs');
var spawn = require('child_process').spawn;
var Path = require('path');

describe('Browserify', function() {
	beforeEach(cleanup);
	it('command line should be able to use require-injector/transform as transform', function(done) {
		copyToNodeModules();
		var proc = spawn(Path.resolve('node_modules/.bin/browserify'), [
			'dir1/test.js', '--global-transform', '[', 'require-injector/transform',
			'--inject', 'browserifyInjector.js', ']'
		], {
			cwd: Path.resolve(__dirname)
			//stdio: 'inherit'
		});
		var output = '';
		proc.on('exit', function(code, signal) {
			if (code !== 0 ) {
				return done.fail('failed to execute browserify command,\n' + output);
			}
			console.log(output);
			expect(output.indexOf('module.exports = \'dir1 \' + "hellow" + "world";') >= 0);
			done();
		});

		proc.stdout.setEncoding('utf-8');
		proc.stdout.on('data', (chunk)=> {
			output += chunk;
		});
		proc.stderr.setEncoding('utf-8');
		proc.stderr.on('data', (chunk)=> {
			output += chunk;
		});

	});

});

function cleanup() {
	shell.rm('-rf', 'bundle.js spec/node_modules/require-injector');
}

function copyToNodeModules() {
	shell.mkdir('-p', 'spec/node_modules/require-injector');
	shell.cp('-r', 'index.js',
		'node-inject.js',
		'replace-require.js',
		'transform.js',
		'spec/node_modules/require-injector/');
	shell.cp('package.json', 'spec/node_modules/require-injector/');
}
