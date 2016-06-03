var rn = require('../register-node');
var Path = require('path');

describe('register-node', () => {
	it('.sortedPackagePathList should contains configured packages and', ()=> {
		rn({
			basedir: Path.resolve(__dirname, '..')
		})
		.fromPackage('module2', {
			basedir: __dirname
		})
			.factory('@a/aaa', function() {
				return 'a';
			})
			.substitute('@b/bbb', 'module3');

		rn.fromPackage('module1', {
			basedir: __dirname
		})
			.factory('aaa', function() {
				return 'a';
			})
			.substitute('bbb', 'module3');

		rn.fromDir('spec/dir2', {
			basedir: __dirname
		})
			.factory('@a/aaa', function() {
				return 'a';
			})
			.substitute('@b/bbb', 'module3')
			.value('@c/ccc', 'c');

		rn.fromDir('spec/dir1', {
			basedir: __dirname
		})
			.factory('aaa', function() {
				return 'a';
			})
			.substitute('bbb', 'module3');

		rn.fromDir('spec/a');
		rn.fromPackage('module2', {
			basedir: __dirname
		});

		console.log(rn.testable().sortedDirs);
		var folders = rn.testable().sortedDirs.map(path => {
			return Path.relative(__dirname, path);
		});
		expect(folders).toEqual([
			'a', 'dir1', 'dir2',
			'node_modules/module1',
			'node_modules/module2'
		]);

	});

	it('.quickSearchDirByFile() should work', () => {
		var foundDir = rn.testable().quickSearchDirByFile(Path.resolve(__dirname, 'dir1/hellow/world.js'));
		expect(foundDir).toBe(Path.resolve(__dirname, 'dir1'));

		foundDir = rn.testable().quickSearchDirByFile(Path.resolve(__dirname, 'node_modules/module1/hellow/world.js'));
		expect(foundDir).toBe(Path.resolve(__dirname, 'node_modules/module1'));

		foundDir = rn.testable().quickSearchDirByFile(Path.resolve(__dirname, 'node_modules/abc'));
		expect(foundDir).toBe(null);
	});


	it('require() call in replacing module 1 & 2 should have been injected with module3\'s exports', ()=> {
		expect(require('module1')).toBe('module1 exports-module3');
		expect(require('module2')).toBe('module2 a');
	});

	it('require() call in replacing directory dir1 & dir2 should have been injected with proper value', ()=> {
		expect(require('./dir1/test')).toBe('dir1 aexports-module3');
		expect(require('./dir2/test')).toBe('dir2 aexports-module3c');
		expect(require('./dir2/dir3')).toBe('dir3 a dir4');
	});

});
