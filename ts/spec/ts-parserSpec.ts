// import * as ts from 'typescript';
import * as fs from 'fs';
import * as Path from 'path';
// import * as _ from 'lodash';
import {TypescriptParser} from '../parse-ts-import';
import {FactoryMap} from '../factory-map';
const EsReplacer = require('../../lib/replace-require');

describe("TypescriptParser", () => {
	it("can replace 'import' and 'require' statements ", () => {
		let file = Path.resolve(__dirname, '../../ts/spec/test-ts.txt');
		let source = fs.readFileSync(file, 'utf8');
		let fm = new FactoryMap().asInterface();
		fm.alias('lodash', 'underscore');
		fm.replaceCode('__api', (file) => {
			if (file.endsWith('.ts'))
				return 'API';
			return 'shit happends';
		});
		var replaced = new TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts');
		console.log(replaced);
		expect(replaced.indexOf('import * as _ from "underscore";') > 0).toBe(true);
		expect(replaced.indexOf('var api = API;') > 0).toBe(true);
		expect(/var a =\s*API;/.test(replaced)).toBe(true);
	});
});

export default {
	ok: 1
}
