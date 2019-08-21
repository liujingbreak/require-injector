"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:no-console
// import * as ts from 'typescript';
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const vm = tslib_1.__importStar(require("vm"));
// import * as _ from 'lodash';
const parse_ts_import_1 = require("../parse-ts-import");
const factory_map_1 = require("../factory-map");
const ts_ast_query_1 = tslib_1.__importDefault(require("../ts-ast-query"));
const EsReplacer = require('../../lib/replace-require');
describe('TypescriptParser', () => {
    let file = Path.resolve(__dirname, '../../ts/spec/test-ts.txt');
    let source = fs.readFileSync(file, 'utf8');
    let fm = new factory_map_1.FactoryMap();
    fm.alias('lodash', 'underscore');
    fm.replaceCode('__api', (file) => {
        if (file.endsWith('.ts'))
            return 'API';
        return 'shit happends';
    });
    fm.alias('asyncModule', '_asyncModule_');
    fm.alias('yyy', '_yyy_');
    var replaced;
    it('can replace \'import\' and \'require\' statements ', () => {
        replaced = new parse_ts_import_1.TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts');
        console.log('---------------\n%s\n--------------', replaced);
        expect(/var __imp[0-9]__ = API, api = __imp[0-9]__\["default"\];/.test(replaced)).toBeTruthy();
        expect(replaced.indexOf('import * as _ from "underscore";')).toBeGreaterThanOrEqual(0);
        expect(replaced).toMatch(/var a =\s*API;/);
        expect(replaced).toMatch(/import\("_asyncModule_"*\);/);
    });
    it('require.ensure should be replaced', () => {
        expect(/require.ensure\("_yyy_",/.test(replaced)).toBe(true);
    });
    xit('"export from" should be replaced', () => {
        const query = new ts_ast_query_1.default(source, 'test-ts.txt');
        query.printAll();
    });
    it('replaceCode should work with import * ....', () => {
        let source = 'import * as _ from \'lodash\';';
        let fm = new factory_map_1.FactoryMap();
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
        let fm = new factory_map_1.FactoryMap();
        fm.replaceCode('lodash', 'foobar()');
        replaced = new parse_ts_import_1.TypescriptParser(new EsReplacer()).replace(source, fm, 'test.ts');
        expect(replaced).toMatch(/\s*foobar\(\);$/);
    });
});
exports.default = {
    ok: 1
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtcGFyc2VyU3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3NwZWMvdHMtcGFyc2VyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0QkFBNEI7QUFDNUIsb0NBQW9DO0FBQ3BDLCtDQUF5QjtBQUN6QixtREFBNkI7QUFDN0IsK0NBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQix3REFBb0Q7QUFDcEQsZ0RBQTBDO0FBQzFDLDJFQUFvQztBQUNwQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUV4RCxRQUFRLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLENBQUM7SUFDaEUsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDM0MsSUFBSSxFQUFFLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7SUFDMUIsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDakMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNoQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQ3ZCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsT0FBTyxlQUFlLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDSCxFQUFFLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUN6QyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6QixJQUFJLFFBQXVCLENBQUM7SUFFNUIsRUFBRSxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtRQUM3RCxRQUFRLEdBQUcsSUFBSSxrQ0FB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