"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const Path = require("path");
class DirTree {
    constructor() {
        this.root = { map: {}, name: '' };
    }
    putData(path, data) {
        var tree = this.ensureNode(path);
        tree.data = data;
    }
    getData(path) {
        var tree = this.findNode(path);
        return tree ? tree.data : null;
    }
    /**
     * @return Array of data
     */
    getAllData(path) {
        if (!Array.isArray(path)) {
            if (Path.sep === '\\')
                path = path.toLowerCase();
            return this.getAllData(path.replace(/\\/g, '/').split('/'));
        }
        // if (path[0] === '')
        // 	path.shift();
        var tree = this.root;
        var datas = [];
        if (_.has(tree, 'data'))
            datas.push(tree.data);
        _.every(path, name => {
            if (_.has(tree, ['map', name])) {
                tree = tree.map[name];
                if (_.has(tree, 'data'))
                    datas.push(tree.data);
                return true;
            }
            tree = null;
            return false;
        });
        return datas;
    }
    ensureNode(path) {
        if (!Array.isArray(path)) {
            if (Path.sep === '\\')
                path = path.toLowerCase();
            return this.ensureNode(path.replace(/\\/g, '/').split('/'));
        }
        var tree = this.root;
        _.each(path, name => {
            if (_.has(tree, ['map', name])) {
                tree = tree.map[name];
            }
            else {
                var child = { map: {}, name };
                tree.map[name] = child;
                tree = child;
            }
        });
        return tree;
    }
    findNode(path) {
        if (!Array.isArray(path)) {
            if (Path.sep === '\\')
                path = path.toLowerCase();
            return this.findNode(path.replace(/\\/g, '/').split('/'));
        }
        var tree = this.root;
        _.every(path, name => {
            if (_.has(tree, ['map', name])) {
                tree = tree.map[name];
                return true;
            }
            tree = null;
            return false;
        });
        return tree;
    }
    traverse(level, tree, lines) {
        var isRoot = false;
        if (!level)
            level = 0;
        if (!tree)
            tree = this.root;
        if (!lines) {
            isRoot = true;
            lines = [];
        }
        var indent = _.repeat('│  ', level);
        lines.push(indent + '├─ ' + tree.name + (tree.data ? ' [x]' : ''));
        _.each(tree.map, (subTree, subNames) => {
            this.traverse(level + 1, subTree, lines);
        });
        return isRoot ? lines.join('\n') : lines;
    }
}
exports.DirTree = DirTree;
//# sourceMappingURL=dir-tree.js.map