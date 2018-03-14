"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import * as ts from 'typescript';
const fs = require("fs");
const Path = require("path");
const vm = require("vm");
// import * as _ from 'lodash';
const parse_ts_import_1 = require("../parse-ts-import");
const factory_map_1 = require("../factory-map");
const EsReplacer = require('../../lib/replace-require');
describe("TypescriptParser", () => {
    let file = Path.resolve(__dirname, '../../ts/spec/test-ts.txt');
    let source = fs.readFileSync(file, 'utf8');
    let fm = new factory_map_1.FactoryMap().asInterface();
    fm.alias('lodash', 'underscore');
    fm.replaceCode('__api', (file) => {
        if (file.endsWith('.ts'))
            return 'API';
        return 'shit happends';
    });
    fm.alias('asyncModule', '_asyncModule_');
    fm.alias('yyy', '_yyy_');
    var replaced;
    it("can replace 'import' and 'require' statements ", () => {
        replaced = new parse_ts_import_1.TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts');
        console.log('---------------\n%s\n--------------', replaced);
        expect(replaced.indexOf('var __imp1__ = API, api = __imp1__["default"];')).toBeGreaterThanOrEqual(0);
        expect(replaced.indexOf('import * as _ from "underscore";')).toBeGreaterThanOrEqual(0);
        expect(replaced).toMatch(/var a =\s*API;/);
        expect(replaced).toMatch(/import\("_asyncModule_"*\);/);
    });
    it('require.ensure should be replaced', () => {
        expect(/require.ensure\("_yyy_",/.test(replaced)).toBe(true);
    });
    it('replaceCode should work with import * ....', () => {
        let source = 'import * as _ from \'lodash\';';
        let fm = new factory_map_1.FactoryMap().asInterface();
        fm.replaceCode('lodash', '"hellow"');
        replaced = new parse_ts_import_1.TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts');
        var sandbox = {
            module: {
                exports: {}
            }
        };
        vm.runInNewContext(replaced, vm.createContext(sandbox));
        expect(sandbox._).toBe('hellow');
    });
    it('replaceCode should work with import "foobar"', () => {
        let source = 'import \'lodash\';';
        let fm = new factory_map_1.FactoryMap().asInterface();
        fm.replaceCode('lodash', 'foobar()');
        replaced = new parse_ts_import_1.TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts');
        expect(replaced).toMatch(/\s*foobar\(\);$/);
    });
});
exports.default = {
    ok: 1
};
//# sourceMappingURL=ts-parserSpec.js.map