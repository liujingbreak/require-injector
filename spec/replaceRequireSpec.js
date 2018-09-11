var rj = require('..');
var Path = require('path');
var fs = require('fs');
var _ = require('lodash');
var {FactoryMap} = require('../dist/factory-map');
const vm = require('vm');

const replacer = rj();
function rr() {
	return replacer.replace.apply(replacer, arguments);
}
describe('replace-require', ()=> {
	describe('ES6 import', ()=> {
		it('replaceCode() should work with import * ....', () => {
			let source = 'import * as _ from \'lodash\';';
			let fm = new FactoryMap();
			fm.replaceCode('lodash', '"hellow"');
			replaced = rr(source, fm, 'test.ts');
			console.log(replaced);
			var sandbox = {
				module: {
					exports: {}
				}
			};
			vm.runInNewContext(replaced, vm.createContext(sandbox));
			expect(sandbox._).toBe('hellow');
		});

		it('replaceCode() should work with import default from ...', () => {
			let source = 'import _ from \'lodash\';';
			let fm = new FactoryMap();
			fm.replaceCode('lodash', '{default: "DEFAULT"}');
			replaced = rr(source, fm, 'test.ts');
			console.log(replaced);
			var sandbox = {};
			vm.runInNewContext(replaced, vm.createContext(sandbox));
			expect(sandbox._).toBe('DEFAULT');
		});

		it('should work for import with mutiple specfics', ()=> {
			var fm = new FactoryMap();
			fm.value('hellow', {replacement: 'sugar'});
			fm.replaceCode('world', 'daddy');
			fm.substitute('foobar', '_');

			var result = rr('import {ok as a, nok as b} from "hellow";', fm);
			expect(/^var __imp[0-9]__ = sugar, a = __imp[0-9]__\["ok"\], b = __imp[0-9]__\["nok"\];$/.test(result)).toBe(true);

			result = rr('import {ok as a, nok as b} from "world";', fm);
			expect(/^var __imp\d__ = daddy, a = __imp\d__\["ok"\], b = __imp\d__\["nok"\];$/.test(result)).toBe(true);

			result = rr('import {ok as a, nok as b} from "_";', fm);
			expect(result).toBe(null);
		});

		it('should work for import default', ()=> {
			var fm = new FactoryMap();
			fm.value('hellow', {replacement: 'sugar'});
			fm.replaceCode('world', 'daddy');
			fm.alias('foobar', 'xxx');

			var result = rr('import A from "hellow";//...', fm);
			expect(/^var __imp\d__ = sugar, A = __imp\d__\["default"\];\/\/\.\.\.$/.test(result)).toBe(true);

			result = rr('import * as B from "world";', fm);
			expect(/^var __imp\d__ = daddy, B = __imp\d__;$/.test(result)).toBe(true);

			result = rr('import "foobar";', fm);
			expect(result).toBe('import "xxx";');

			result = rr('import "world";', fm);
			expect(/^daddy;$/.test(result)).toBe(true);

			result = rr('import a, {b} from "world";', fm);
			expect(result).toBe('var __imp8__ = daddy, a = __imp8__["default"], b = __imp8__["b"];');
		});

		it('should work for alias', () => {
			var fm = new FactoryMap();
			fm.alias('@foo/bar2', 'scrollbar2');
			fm.alias('@foo/bar', 'scrollbar');

			var result = rr('import A from "@foo/bar";', fm);
			expect(result).toBe('import A from "scrollbar";');

			result = rr('import B from "@foo/bar/subdir/file.js";', fm);
			expect(result).toBe('import B from "scrollbar/subdir/file.js";');

			result = rr('import A from "ok";', fm);
			expect(result).toBe(null);
		});
	});

	describe('injectToFile for import()', ()=> {
		it('should work', ()=> {
			rj.cleanup();
			rj({basedir: __dirname});
			rj.fromDir('dir1')
			.alias('hellow', 'sugar')
			.alias('world', 'daddy');

			var file = Path.resolve(__dirname, 'dir1/testEs6Import.js');
			var result = rj.injectToFile(file, fs.readFileSync(file, 'utf8'));
			expect(result.indexOf('import("sugar").then(()=> {})') > 0).toBe(true);
		});
	});

	describe('replace', ()=> {
		it('should work for sample1', function() {
			var fm = new FactoryMap();
			fm.value('hellow', {replacement: '__'});
			var result = rr('require("hellow");', fm);

			expect(result).toBe('__;');
		});

		it('should work for sample2', function() {
			var fm = new FactoryMap();
			fm.value('hellow', {replacement: ''})
			.replaceCode('a', 'b');
			var result = rr('require("hellow");require("a");require("hellow");var s = require("b");',
				fm);

			expect(result).toBe(';b;;var s = require("b");');
		});

		it('should work for sample3', function() {
			var fm = new FactoryMap();
			fm.value('hellow', {replacement: ''})
			.replaceCode('a', 'b');
			var result = rr('require("hellow");obj.require("a");', fm);

			expect(result).toBe(';obj.require("a");');
		});

		it('should work for webpack inline load', function() {
			var fm = new FactoryMap();
			fm.value('hellow', {replacement: '__'});
			fm.alias('world', '__');

			var result = rr('require("style-loader!css-loader?modules!hellow");', fm);
			expect(result).toBe('__;');
			result = rr('require("style-loader!css-loader?modules!world");', fm);
			expect(result).toBe('require("style-loader!css-loader?modules!__");');

			result = rr('import "style-loader!css-loader?modules!world";', fm);
			expect(result).toBe('import "style-loader!css-loader?modules!__";');
		});

		it('should work for sample3 with .value() function factory', function() {
			var valueFactory = {
				replacement: function(file, matchRegex) {
					return '';
				}
			};

			spyOn(valueFactory, 'replacement').and.callThrough();
			var fm = new FactoryMap();
			fm.value('hellow', valueFactory)
			.value('a', {replacement: 'b'});

			var result = rr('require("hellow");obj.require("a");', fm);
			expect(valueFactory.replacement).toHaveBeenCalledWith(undefined, undefined);
			var result2 = rr('require("hellow");obj.require("a");', fm, 'test-file');
			expect(valueFactory.replacement).toHaveBeenCalledWith('test-file', undefined);

			expect(result).toBe(';obj.require("a");');
			expect(result2).toBe(';obj.require("a");');
		});

		it('should work with regular expression .substitute() factory', ()=> {
			var mockFactory = {
				replacement: function(file, matchRegex) {
					return matchRegex[0].replace(matchRegex[1], 'en');
				}
			};
			var fm = new FactoryMap();
			spyOn(mockFactory, 'replacement').and.callThrough();
			spyOn(fm, 'matchRequire').and.callThrough();
			spyOn(fm, 'getReplacement').and.callThrough();

			fm.substitute(/[^\{]*(\{\{[^\{]+\}\})/, mockFactory.replacement);
			var result = rr('require("foo-{{bar}}");', fm, '');
			expect(fm.matchRequire).toHaveBeenCalled();
			expect(fm.getReplacement).toHaveBeenCalled();
			expect(mockFactory.replacement).toHaveBeenCalled();
			expect(result).toBe('require("foo-en");');
		});

		it('should work with regular expression replaceCode()', ()=> {
			var mockFactory = {
				replaceReq: function(file, matchRegex) {
					return matchRegex[0].replace(matchRegex[1], 'en');
				},
				replaceEnsure: function(file, m) {
					return m[0] + '_en';
				}
			};
			var fm = new FactoryMap();

			fm.replaceCode(/[^\{]*(\{\{[^\{]+\}\})/, mockFactory.replaceReq);
			fm.replaceCode(/abc/, mockFactory.replaceEnsure);

			var f = function() {return null;};
			fm.factory(/xxx/, f);
			var result = rr('require("foo-{{bar}}");' +
				'require.ensure(["abc", "efg"], function(){});' +
				'require("xxx")', fm, '');


			expect(result).toBe('foo-en;require.ensure([abc_en, "efg"], function(){});(' + f.toString() + ')("",["xxx"])');
		});

		it('should work with regular expression value() .replacement', ()=> {
			var mockFactory = {
				replacement: function(file, matchRegex) {
					return matchRegex[0].replace(matchRegex[1], 'en');
				}
			};
			var fm = new FactoryMap();
			spyOn(mockFactory, 'replacement').and.callThrough();
			spyOn(fm, 'matchRequire').and.callThrough();
			spyOn(fm, 'getReplacement').and.callThrough();

			fm.value(/[^\{]*(\{\{[^\{]+\}\})/, mockFactory);
			var result = rr('require("foo-{{bar}}");', fm, '');
			expect(fm.matchRequire).toHaveBeenCalled();
			expect(fm.getReplacement).toHaveBeenCalled();
			expect(mockFactory.replacement).toHaveBeenCalled();
			expect(result).toBe('foo-en;');
		});

		it('should work for require.ensure sample 1', function() {
			var fm = new FactoryMap();
			fm.substitute('A', 'x')
			.substitute('B', 'y');

			var result = rr('require.ensure(["A", "B"], function() {});', fm);
			expect(result).toBe('require.ensure(["x", "y"], function() {});');
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
			var onReplace = jasmine.createSpy('onReplace');
			rj.getInstance().on('replace', onReplace);
			var file = Path.resolve(__dirname, 'node_modules/module1/index.js');
			var result = rj.getInstance().injectToFile(file, fs.readFileSync(file, 'utf8'));
			expect(_.trim(result)).toBe('module.exports = \'module1 \' + require("aaa");');
			expect(onReplace.calls.count()).toBe(1);
			console.log('onReplace(): ', onReplace.calls.allArgs())
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
			console.log(rj.getInstance());
		});
		it('.substitute() should work', function() {
			var result = rj.injectToFile(Path.resolve(__dirname, 'dir1/testRequireEnsure.js'),
				fs.readFileSync(Path.resolve(__dirname, 'dir1/testRequireEnsure.js'), 'utf8'));
			expect(_.trim(result)).toBe('require.ensure(["aaa", "B"], function() {})');
		});
	});
});
