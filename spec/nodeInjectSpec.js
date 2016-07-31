var rj = require('..');
var Path = require('path');
var bresolve = require('browser-resolve').sync;
var fs = require('fs');
var _ = require('lodash');

describe('node-injector', () => {
	beforeAll(()=> {
		try {
			fs.accessSync(Path.resolve(__dirname, 'link'), fs.F_OK);
		} catch (e) {
			fs.symlinkSync('./dir1_', Path.resolve(__dirname, 'link'));
		}
	});

	describe('for single package and dir', () => {
		beforeEach(()=> {
			rj({
				basedir: Path.resolve(__dirname, '..'),
				resolveOpts: {
					basedir: __dirname
				},
				debug: true
			}).fromPackage('module2')
				.factory('@a/aaa', function() {
					return 'a';
				})
				.substitute('@b/bbb', 'module3');

			rj.fromPackage('module1')
				.factory('aaa', function() {
					return 'a';
				})
				.substitute('bbb', 'module3');
			rj.fromDir('spec/dir1_2')
				.factory('aaa', function() {
					return 'a';
				})
				.substitute('bbb', 'module3');

			rj.fromDir('spec/dir2')
				.factory('@a/aaa', function() {
					return 'a';
				})
				.substitute('@b/bbb', 'module3')
				.value('@c/ccc', 'c');

			rj.fromDir('spec/dir1')
				.factory('aaa', function() {
					return 'a';
				})
				.substitute('bbb', 'module3');

			rj.fromDir('spec/a');
			rj.fromPackage('module2');
		});

		afterEach(() => {
			rj.cleanup();
			delete require.cache[require.resolve('module1')];
			delete require.cache[require.resolve('module2')];
			delete require.cache[require.resolve('module3')];
			delete require.cache[require.resolve('./dir1/test.js')];
			delete require.cache[require.resolve('./dir2/test.js')];
			delete require.cache[require.resolve('./dir2/dir3')];
			delete require.cache[require.resolve('./dir2/dir3/dir4')];
		});

		it('.sortedPackagePathList should contains configured packages and', ()=> {
			rj.fromDir('spec/link');
			var folders = rj.testable().sortedDirs.map(path => {
				return path.substring(__dirname.length + 1);
			});
			expect(_.difference(folders, ['dir1_/', 'link/',
				'a/', 'dir1/', 'dir1_2/', 'dir2/',
				'node_modules/module1/',
				'node_modules/module2/'
			])).toEqual([]);
			expect(_.difference(['dir1_/', 'link/',
				'a/', 'dir1/', 'dir1_2/', 'dir2/',
				'node_modules/module1/',
				'node_modules/module2/'
			], folders)).toEqual([]);
		});

		it('.quickSearchDirByFile() should work', () => {
			var foundDir = rj.testable().quickSearchDirByFile(Path.resolve(__dirname, 'dir1/hellow/world.js'));
			expect(Path.resolve(foundDir)).toBe(Path.resolve(__dirname, 'dir1'));

			foundDir = rj.testable().quickSearchDirByFile(Path.resolve(__dirname, 'node_modules/module1/hellow/world.js'));
			expect(Path.resolve(foundDir)).toBe(Path.resolve(__dirname, 'node_modules/module1'));

			foundDir = rj.testable().quickSearchDirByFile(Path.resolve(__dirname, 'node_modules/abc'));
			expect(foundDir).toBe(null);
		});

		it('require() call in replacing module 1 & 2 should have been injected with module3\'s exports', ()=> {
			expect(require('module1')).toBe('module1 exports-module3');
			expect(require('module2')).toBe('module2 a');
		});

		it('require() call in replacing directory dir1 & dir2 should have been injected with proper value', ()=> {
			expect(require('./dir1/test')).toBe('dir1 aexports-module3');
			// expect(require('./dir2/test')).toBe('dir2 aexports-module3c');
			// expect(require('./dir2/dir3')).toBe('dir3 a dir4');
		});

		it('browser resolve function should work as parameter for .fromePackage()', function() {
			rj.cleanup();
			rj();
			expect(rj.testable().sortedDirs.length).toBe(0);
			rj.fromPackage('module1', bresolve, {
				paths: [__dirname + '/node_modules']
			}).value('abc', 'ABC');
			rj.fromPackage('@br/browser-module', bresolve, {
				paths: [__dirname + '/node_modules']
			}).value('abc', 'ABC');
			console.log(rj.testable().sortedDirs);
			expect(rj.testable().sortedDirs.length).toBe(2);
		});

		it('browser resolve function should work as global options', function() {
			rj.cleanup();
			rj({
				resolve: bresolve,
				resolveOpts: {
					paths: [__dirname + '/node_modules']
				}
			});
			expect(rj.testable().sortedDirs.length).toBe(0);
			rj.fromPackage('module1').value('abc', 'ABC');
			rj.fromPackage('@br/browser-module').value('abc', 'ABC');
			console.log(rj.testable().sortedDirs);
			expect(rj.testable().sortedDirs.length).toBe(2);
		});

		it('should be chainable', ()=>{
			rj.cleanup();
			rj({basedir: __dirname, resolveOpts: {basedir: __dirname}});
			rj.fromPackage('module1')
				.value('cba', 123)
				.value('xyz', 321)
				.factory('xxx', ()=> {
					return 456;
				})
				.substitute('yyy', 'aaa')
				.substitute('zzz', 'zzz');
		});
	});

	describe('when target file is from mutiple packages or directories', ()=> {
		afterEach(() => {
			rj.cleanup();
			delete require.cache[require.resolve('module1')];
			delete require.cache[require.resolve('module2')];
			delete require.cache[require.resolve('module3')];
			delete require.cache[require.resolve('./dir1/test.js')];
			delete require.cache[require.resolve('./dir2/test.js')];
			delete require.cache[require.resolve('./dir2/dir3')];
			delete require.cache[require.resolve('./dir2/dir3/dir4')];
		});

		it('.fromPackage() should work with array of package names', ()=> {
			rj({
				basedir: Path.resolve(__dirname, '..'),
				resolve: bresolve,
				resolveOpts: {
					paths: [__dirname + '/node_modules']
				},
				debug: true
			});
			//rj.fromPackage('module1')
			rj.fromPackage(['module1', 'module2', '@br/browser-module'])
				.value('bbb', 'xxx')
				.factory('@a/aaa', function() {return 'xxx';})
				.value('module3', {value: 'xxx', replacement: '"xxx"'})
				.value('abc', 'xxx');

			expect(require('module1')).toBe('module1 xxx');
			expect(require('module2')).toBe('module2 xxx');

			var browserModuleFile = bresolve('@br/browser-module', {basedir: __dirname});
			var code = rj.injectToFile(browserModuleFile, fs.readFileSync(browserModuleFile, 'utf8'));
			expect(_.trim(code)).toBe('module.exports = "xxx" + "xxx";');
		});

		it('.fromDir() should work with array of directories', ()=> {
			rj({
				basedir: Path.resolve(__dirname, '..'),
				debug: true
			});
			rj.fromDir(['spec/dir1', 'spec/dir2'])
				.value('bbb', 'xxx')
				.factory('aaa', function() {return 'xxx';})
				.value('@a/aaa', 'xxx')
				.value('@b/bbb', 'xxx')
				.value('@c/ccc', 'xxx');
			expect(require('./dir1/test.js')).toBe('dir1 xxxxxx');
			expect(require('./dir2/test.js')).toBe('dir2 xxxxxxxxx');
			rj.cleanup();
		});
	});

	describe('bug should be fixed for ', ()=> {
		afterEach(() => {
			rj.cleanup();
			delete require.cache[require.resolve('module1')];
			delete require.cache[require.resolve('module2')];
			delete require.cache[require.resolve('module3')];
			delete require.cache[require.resolve('./dir1/test.js')];
			delete require.cache[require.resolve('./dir2/test.js')];
			delete require.cache[require.resolve('./dir2/dir3')];
			delete require.cache[require.resolve('./dir2/dir3/dir4')];
		});

		it('.quickSearchDirByFile() should work for similar directory names like dir1 and dir12', () => {
			rj({
				basedir: Path.resolve(__dirname, '..'),
				resolveOpts: {
					basedir: __dirname
				},
				debug: true
			}).fromPackage('module2')
				.factory('@a/aaa', function() {
					return 'a';
				})
				.substitute('@b/bbb', 'module3');

			rj.fromPackage('module1')
				.factory('aaa', function() {
					return 'a';
				})
				.substitute('bbb', 'module3');

			rj.fromDir('spec/dir2')
				.factory('@a/aaa', function() {
					return 'a';
				})
				.substitute('@b/bbb', 'module3')
				.value('@c/ccc', 'c');

			rj.fromDir('spec/dir1_2')
				.factory('aaa', function() {
					return 'a';
				})
				.substitute('bbb', 'module3');
			rj.fromDir('spec/dir1_')
					.substitute('bbb', 'module3');
			rj.fromDir('spec/dir1')
				.factory('aaa', function() {
					return 'a';
				})
				.substitute('bbb', 'module3');

			rj.fromDir('spec/a');
			rj.fromPackage('module2');
			var foundDir = rj.testable().quickSearchDirByFile(Path.resolve(__dirname, 'dir1_2/test12.js'));
			console.log(rj.testable().sortedDirs);
			expect(foundDir).toBe(Path.resolve(__dirname, 'dir1_2').replace(/\\/g, '/') + '/');
		});
	});
});
