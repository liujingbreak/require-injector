"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
const tslib_1 = require("tslib");
const replace_require_1 = tslib_1.__importDefault(require("./replace-require"));
const loader = function (content, sourcemap) {
    var callback = this.async();
    if (!callback)
        throw new Error('require-injector only supports async loader');
    try {
        const { content: newContent } = load(content, this);
        callback(null, newContent);
    }
    catch (ex) {
        callback(ex);
    }
};
exports.default = loader;
function load(content, loader) {
    var rj = loader.query.injector || new replace_require_1.default({ noNode: true });
    var file = loader.resourcePath;
    let inputAst;
    if (loader.query.astCache != null) {
        inputAst = loader.query.astCache(loader.resourcePath);
    }
    const { replaced, patches, ast } = rj.injectToFileWithPatchInfo(file, content, inputAst || undefined);
    if (loader.query.onAstCreated != null) {
        loader.query.onAstCreated(file, ast);
    }
    return {
        content: replaced,
        ast,
        patches
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy93ZWJwYWNrLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBRUEsZ0ZBQXlDO0FBaUJ6QyxNQUFNLE1BQU0sR0FBcUIsVUFBeUMsT0FBTyxFQUFFLFNBQVM7SUFDMUYsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0lBQ2pFLElBQUk7UUFDRixNQUFNLEVBQUMsT0FBTyxFQUFFLFVBQVUsRUFBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEQsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztLQUM1QjtJQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ1gsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ2Q7QUFDSCxDQUFDLENBQUM7QUFFZ0IseUJBQU87QUFFekIsU0FBUyxJQUFJLENBQUMsT0FBd0IsRUFBRSxNQUFnQztJQUN0RSxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLHlCQUFRLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztJQUMvRCxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO0lBQy9CLElBQUksUUFBNEQsQ0FBQztJQUNqRSxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksRUFBRTtRQUNqQyxRQUFRLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0tBQ3ZEO0lBRUQsTUFBTSxFQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFDLEdBQUcsRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxPQUFpQixFQUFFLFFBQVEsSUFBSSxTQUFTLENBQUMsQ0FBQztJQUM5RyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxJQUFJLElBQUksRUFBRTtRQUNyQyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDdEM7SUFDRCxPQUFPO1FBQ0wsT0FBTyxFQUFFLFFBQVE7UUFDakIsR0FBRztRQUNILE9BQU87S0FDUixDQUFDO0FBQ0osQ0FBQyJ9