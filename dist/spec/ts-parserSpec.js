"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import * as ts from 'typescript';
const fs = require("fs");
const Path = require("path");
// import * as _ from 'lodash';
const parse_ts_import_1 = require("../parse-ts-import");
const factory_map_1 = require("../factory-map");
const EsReplacer = require('../../lib/replace-require');
describe("TypescriptParser", () => {
    it("can replace 'import' and 'require' statements ", () => {
        let file = Path.resolve(__dirname, '../../ts/spec/test-ts.txt');
        let source = fs.readFileSync(file, 'utf8');
        let fm = new factory_map_1.FactoryMap().asInterface();
        fm.alias('lodash', 'underscore');
        fm.replaceCode('__api', (file) => {
            if (file.endsWith('.ts'))
                return 'API';
            return 'shit happends';
        });
        var replaced = new parse_ts_import_1.TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts');
        console.log(replaced);
        expect(replaced.indexOf('import * as _ from "underscore";') > 0).toBe(true);
        expect(replaced.indexOf('var api = API;') > 0).toBe(true);
        expect(/var a =\s*API;/.test(replaced)).toBe(true);
    });
});
exports.default = {
    ok: 1
};
//# sourceMappingURL=ts-parserSpec.js.map