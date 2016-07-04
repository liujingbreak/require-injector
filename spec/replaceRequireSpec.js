var rr = require('..').replace;
var rj = require('..');
var Path = require('path');
var fs = require('fs');
var _ = require('lodash');

describe('replace-require', ()=> {
	describe('replace', ()=> {
		it('should work for sample1', function() {
			var result = rr('require("hellow");', {
				hellow: {rq: '__'}
			});

			expect(result).toBe('__;');
		});

		it('should work for sample2', function() {
			var result = rr('require("hellow");require("a");require("hellow");var s = require("b");', {
				hellow: '',
				a: 'b'
			});

			expect(result).toBe(';b;;var s = require("b");');
		});

		it('should work for sample3', function() {
			var result = rr('require("hellow");obj.require("a");', {
				hellow: '',
				a: 'b'
			});

			expect(result).toBe(';obj.require("a");');
		});

		it('should work for require.ensure sample 1', function() {
			var result = rr('require.ensure(["A", "B"], function() {});', {
				A: {rs: 'x'},
				B: {rs: 'y'}
			});
			expect(result).toBe('require.ensure([x, y], function() {});');
		});
	});

	describe('injectToFile() for require() ', ()=> {
		beforeAll(()=>{
			rj.cleanup();

			rj({basedir: __dirname});

			rj.fromPackage('module1', {basedir: __dirname})
			.substitute('bbb', 'aaa');

			rj.fromPackage('module2', {basedir: __dirname})
			.value('@a/aaa', ['AAA']);
		});

		it('.substitute() should work for sample module1', ()=> {
			var file = Path.resolve(__dirname, 'node_modules/module1/index.js');
			var result = rj.injectToFile(file, fs.readFileSync(file, 'utf8'));
			expect(_.trim(result)).toBe('module.exports = \'module1 \' + require(\'aaa\');');
		});

		it('.value() should do JSON stringified for sample module2', ()=> {
			var file = Path.resolve(__dirname, 'node_modules/module2/index.js');
			var result = rj.injectToFile(file, fs.readFileSync(file, 'utf8'));
			expect(_.trim(result)).toBe('module.exports = \'module2 \' + ["AAA"];');
		});

		it('nothing should be changed if file path does not match any injection setting', ()=> {
			var file = Path.resolve(__dirname, 'node_modules/module1/index.js');
			var code = fs.readFileSync(file, 'utf8');
			var result = rj.injectToFile('c:\\abc\\efg.js', code);
			expect(result).toBe(code);
		});

		it('.value({replacement: string}) should work', ()=> {
			rj.fromDir(Path.resolve('test'))
				.value('donnotStrinifyMe', {
					replacement: 'REPLACED'
				});
			var result = rj.injectToFile(Path.resolve('test/efg.js'), 'require("donnotStrinifyMe");');
			expect(result).toBe('REPLACED;');
		});

		it('.factory() should work', ()=> {
			rj.fromDir(Path.resolve('test'))
				.factory('hellow', function() {return 1;});
			var result = rj.injectToFile(Path.resolve('test/efg.js'), 'require("hellow");');
			expect(eval(result)).toBe(1);
		});
	});

	describe('injectToFile() for require.ensure() ', ()=> {
		beforeAll(()=>{
			rj.cleanup();
			rj({basedir: __dirname});
			rj.fromDir(['dir1', 'dir2'])
				.substitute('A', 'aaa')
				.value('B', 'shouldnotBeReplaced');
		});
		it('.substitute() should work', function() {
			var result = rj.injectToFile(Path.resolve(__dirname, 'dir1/testRequireEnsure.js'),
				fs.readFileSync(Path.resolve(__dirname, 'dir1/testRequireEnsure.js'), 'utf8'));
			expect(_.trim(result)).toBe('require.ensure([\'aaa\', "B"], function() {})');
		});
	});
});
