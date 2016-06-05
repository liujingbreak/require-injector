var rr = require('..').replace;
var rn = require('..');
var Path = require('path');
var fs = require('fs');

describe('replace-require', ()=> {
	describe('replace', ()=> {
		it('should work for sample1', function() {
			var result = rr('require("hellow");', {
				hellow: '__'
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
	});

	describe('injectToFile()', ()=> {
		beforeAll(()=>{
			rn.cleanup();

			rn({basedir: __dirname});

			rn.fromPackage('module1', {basedir: __dirname})
			.substitute('bbb', 'aaa');

			rn.fromPackage('module2', {basedir: __dirname})
			.value('@a/aaa', ['AAA']);
		});

		it('.substitute() should work for sample module1', ()=> {
			var file = Path.resolve(__dirname, 'node_modules/module1/index.js');
			var result = rr.injectToFile(file, fs.readFileSync(file, 'utf8'));
			expect(result).toBe('module.exports = \'module1 \' + require(\'aaa\');\n');
		});

		it('.value() should do JSON stringified for sample module2', ()=> {
			var file = Path.resolve(__dirname, 'node_modules/module2/index.js');
			var result = rr.injectToFile(file, fs.readFileSync(file, 'utf8'));
			expect(result).toBe('module.exports = \'module2 \' + ["AAA"];\n');
		});

		it('nothing should be changed if file path does not match any injection setting', ()=> {
			var file = Path.resolve(__dirname, 'node_modules/module1/index.js');
			var code = fs.readFileSync(file, 'utf8');
			var result = rr.injectToFile('c:\\abc\\efg.js', code);
			expect(result).toBe(code);
		});
	});
});
