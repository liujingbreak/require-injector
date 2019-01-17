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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtcGFyc2VyU3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3NwZWMvdHMtcGFyc2VyU3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0QkFBNEI7QUFDNUIsb0NBQW9DO0FBQ3BDLCtDQUF5QjtBQUN6QixtREFBNkI7QUFDN0IsK0NBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQix3REFBb0Q7QUFDcEQsZ0RBQTBDO0FBQzFDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBRXhELFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDakMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztJQUNoRSxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMzQyxJQUFJLEVBQUUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztJQUMxQixFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNqQyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2hDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7WUFDdkIsT0FBTyxLQUFLLENBQUM7UUFDZCxPQUFPLGVBQWUsQ0FBQztJQUN4QixDQUFDLENBQUMsQ0FBQztJQUNILEVBQUUsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3pDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLElBQUksUUFBZ0IsQ0FBQztJQUVyQixFQUFFLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1FBQzdELFFBQVEsR0FBRyxJQUFJLGtDQUFnQixDQUFDLElBQUksVUFBVSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqRixPQUFPLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQywwREFBMEQsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMvRixNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkYsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUN6RCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5RCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDckQsSUFBSSxNQUFNLEdBQUcsZ0NBQWdDLENBQUM7UUFDOUMsSUFBSSxFQUFFLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7UUFDMUIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDckMsUUFBUSxHQUFHLElBQUksa0NBQWdCLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2pGLElBQUksT0FBTyxHQUFRO1lBQ2xCLE1BQU0sRUFBRTtnQkFDUCxPQUFPLEVBQUUsRUFBRTthQUNYO1NBQ0QsQ0FBQztRQUNGLEVBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsSUFBSSxNQUFNLEdBQUcsb0JBQW9CLENBQUM7UUFDbEMsSUFBSSxFQUFFLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7UUFDMUIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDckMsUUFBUSxHQUFHLElBQUksa0NBQWdCLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2pGLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsa0JBQWU7SUFDZCxFQUFFLEVBQUUsQ0FBQztDQUNMLENBQUMifQ==