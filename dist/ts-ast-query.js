"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
// import api from '__api';
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const typescript_2 = require("typescript");
const { green, yellow } = require('chalk');
// const log = require('log4js').getLogger('ts-ast-query');
function printFile(fileName) {
    if (!fileName) {
        // tslint:disable-next-line
        console.log('Usage:\n' + green('drcp run @dr-core/ng-app-builder/dist/utils/ts-ast-query --file <ts file>'));
        return;
    }
    new Selector(fs.readFileSync(fileName, 'utf8'), fileName).printAll();
}
exports.printFile = printFile;
// type Callback = (ast: ts.Node, path: string[]) => boolean | void;
class Selector {
    constructor(src, file) {
        if (typeof src === 'string') {
            this.src = typescript_1.default.createSourceFile(file || 'unknown', src, typescript_1.default.ScriptTarget.ESNext, true, typescript_1.default.ScriptKind.TSX);
        }
        else {
            this.src = src;
        }
    }
    walkAst(ast, handlers) {
        if (Array.isArray(ast)) {
            handlers = ast;
            ast = this.src;
        }
        const queryMap = {};
        if (!handlers)
            return;
        handlers.forEach(h => queryMap[h.query] = new Query(h.query));
        this.traverse(ast, (ast, path, parents) => {
            let skip = false;
            handlers.some(h => {
                if (queryMap[h.query].matches(path)) {
                    h.callback(ast, path, parents);
                    return true;
                }
                return false;
            });
            if (skip)
                return true;
        });
    }
    findWith(...arg) {
        let query;
        let ast;
        let callback;
        if (typeof arg[0] === 'string') {
            ast = this.src;
            query = arg[0];
            callback = arg[1];
        }
        else {
            ast = arg[0];
            query = arg[1];
            callback = arg[2];
        }
        let res = null;
        const q = new Query(query);
        this.traverse(ast, (ast, path, parents) => {
            if (res != null)
                return true;
            if (q.matches(path)) {
                res = callback(ast, path, parents);
                if (res != null)
                    return true;
            }
        });
        return res;
    }
    findAll(ast, query) {
        let q;
        if (typeof ast === 'string') {
            query = ast;
            q = new Query(ast);
            ast = this.src;
        }
        else {
            q = new Query(query);
        }
        const res = [];
        this.traverse(ast, (ast, path, _parents, _isLeaf) => {
            if (q.matches(path)) {
                res.push(ast);
            }
        });
        return res;
    }
    findFirst(ast, query) {
        let q;
        if (typeof ast === 'string') {
            query = ast;
            q = new Query(query);
            ast = this.src;
        }
        else {
            q = new Query(query);
        }
        let res;
        this.traverse(ast, (ast, path) => {
            if (res)
                return true;
            if (q.matches(path)) {
                res = ast;
                return true;
            }
        });
        return res;
    }
    list(ast = this.src) {
        let out = '';
        this.traverse(ast, (node, path, _parents, noChild) => {
            if (noChild) {
                out += path.join('>') + ' ' + node.getText(this.src);
                out += '\n';
            }
        });
        return out;
    }
    printAll(ast = this.src) {
        this.traverse(ast, (node, path, _parents, noChild) => {
            if (noChild) {
                // tslint:disable-next-line:no-console
                console.log(path.join('>'), green(node.getText(this.src)));
            }
        });
    }
    printAllNoType(ast = this.src) {
        this.traverse(ast, (node, path, _parents, noChild) => {
            if (noChild) {
                // tslint:disable-next-line:no-console
                console.log(path.map(name => name.split(':')[0]).join('>'), green(node.getText(this.src)));
            }
        });
    }
    /**
     *
     * @param ast
     * @param cb return true to skip traversing child node
     * @param level default 0
     */
    traverse(ast, cb, propName = '', parents = [], pathEls = []) {
        let needPopPathEl = false;
        // if (ast.kind !== ts.SyntaxKind.SourceFile) {
        // let propName = parents[parents.length - 1] === this.src ? '' : this._findParentPropName(ast, parents);
        let pathEl = ':' + typescript_2.SyntaxKind[ast.kind];
        if (propName)
            pathEl = '.' + propName + pathEl;
        pathEls.push(pathEl);
        needPopPathEl = true;
        // }
        const res = cb(ast, pathEls, parents, ast.getChildCount(this.src) <= 0);
        if (res !== true) {
            parents.push(ast);
            const _value2key = new Map();
            // tslint:disable-next-line:forin
            // for (const key in ast) {
            const self = this;
            for (const key of Object.keys(ast)) {
                if (key === 'parent' || key === 'kind')
                    continue;
                _value2key.set(ast[key], key);
            }
            typescript_1.default.forEachChild(ast, sub => {
                self.traverse(sub, cb, _value2key.get(sub), parents, pathEls);
            }, subArray => self.traverseArray(subArray, cb, _value2key.get(subArray), parents, pathEls));
            parents.pop();
        }
        if (needPopPathEl)
            pathEls.pop();
    }
    pathForAst(ast) {
        const pathEls = [];
        let p = ast;
        while (p && p !== this.src) {
            pathEls.push(this.propNameForAst(p) + ':' + typescript_2.SyntaxKind[p.kind]);
            p = p.parent;
        }
        return pathEls.reverse().join('>');
    }
    propNameForAst(ast) {
        const p = ast.parent;
        for (const prop of Object.keys(p)) {
            const value = p[prop];
            if (prop === 'parent' || prop === 'kind')
                continue;
            if (Array.isArray(value)) {
                const idx = value.indexOf(ast);
                if (idx >= 0) {
                    return prop + `[${idx}]`;
                }
            }
            if (value === ast) {
                return prop;
            }
        }
        return '';
    }
    traverseArray(nodes, cb, propName = '', parents = [], pathEls = []) {
        let i = 0;
        for (const ast of nodes) {
            this.traverse(ast, cb, propName + `[${i++}]`, parents, pathEls);
        }
    }
}
exports.default = Selector;
class Query {
    constructor(query) {
        this.fromRoot = false;
        if (query.startsWith('^')) {
            query = query.slice(1);
            this.fromRoot = true;
        }
        this.queryPaths = query.trim()
            .replace(/\s*>\s*/g, '>')
            .split(/\s+/)
            .map(paths => paths.split('>')
            .map(singleAstDesc => this._parseDesc(singleAstDesc)).reverse())
            .reverse();
    }
    matches(path) {
        let testPos = path.length - 1;
        const startTestPos = testPos;
        for (const consecutiveNodes of this.queryPaths.slice(0)) {
            while (true) {
                if (this.matchesConsecutiveNodes(consecutiveNodes, path, testPos)) {
                    testPos -= consecutiveNodes.length;
                    break;
                }
                else if (testPos === startTestPos) {
                    return false;
                }
                else {
                    testPos--;
                }
                if (consecutiveNodes.length > testPos + 1)
                    return false;
            }
        }
        return this.fromRoot ? testPos === 0 : true;
    }
    _parseDesc(singleAstDesc) {
        const astChar = {};
        // tslint:disable-next-line
        let m = /^(?:\.([a-zA-Z0-9_$]+)(?:\[([0-9]*)\])?)?(?:\:([a-zA-Z0-9_$]+))?$|^\*$/.exec(singleAstDesc);
        if (m == null) {
            throw new Error(`Invalid query string "${yellow(singleAstDesc)}"`);
        }
        if (m[1]) {
            astChar.propertyName = m[1];
            if (m[2])
                astChar.propIndex = parseInt(m[2], 10);
        }
        if (m[3])
            astChar.kind = m[3];
        // if (m[4])
        // 	astChar.text = new RegExp(m[4]);
        return astChar;
    }
    matchesAst(query, target) {
        for (const key of Object.keys(query)) {
            const value = query[key];
            if (lodash_1.default.isRegExp(value)) {
                if (!value.test(target[key]))
                    return false;
            }
            else if (target[key] !== value)
                return false;
        }
        return true;
    }
    /**
     * predicte if it matches ">" connected path expression
     * @param queryNodes all items in reversed order
     * @param path
     * @param testPos starts with path.length - 1
     */
    matchesConsecutiveNodes(queryNodes, path, testPos) {
        if (queryNodes.length > testPos + 1)
            return false;
        for (const query of queryNodes.slice(0)) {
            const target = this._parseDesc(path[testPos--]);
            if (!this.matchesAst(query, target))
                return false;
        }
        return true;
    }
}
exports.Query = Query;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYXN0LXF1ZXJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdHMtYXN0LXF1ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUF5QjtBQUN6QiwyQkFBMkI7QUFDM0IsNERBQXVCO0FBQ3ZCLG9FQUE0QjtBQUM1QiwyQ0FBOEM7QUFDOUMsTUFBTSxFQUFDLEtBQUssRUFBRSxNQUFNLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDekMsMkRBQTJEO0FBRTNELFNBQWdCLFNBQVMsQ0FBQyxRQUFnQjtJQUN6QyxJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2QsMkJBQTJCO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQywyRUFBMkUsQ0FBQyxDQUFDLENBQUM7UUFDN0csT0FBTztLQUNQO0lBQ0QsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDdEUsQ0FBQztBQVBELDhCQU9DO0FBTUQsb0VBQW9FO0FBQ3BFLE1BQXFCLFFBQVE7SUFLNUIsWUFBWSxHQUEyQixFQUFFLElBQWE7UUFDckQsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7WUFDNUIsSUFBSSxDQUFDLEdBQUcsR0FBRyxvQkFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksSUFBSSxTQUFTLEVBQUUsR0FBRyxFQUFFLG9CQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFDNUUsSUFBSSxFQUFFLG9CQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzFCO2FBQU07WUFDTixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztTQUNmO0lBQ0YsQ0FBQztJQUlELE9BQU8sQ0FBQyxHQUEyQixFQUFHLFFBQXlCO1FBQzlELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxH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