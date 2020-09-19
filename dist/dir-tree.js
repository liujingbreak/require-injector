"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirTree = void 0;
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
const Path = require("path");
class DirTree {
    constructor() {
        this.root = { map: {}, name: '' };
    }
    putRootData(data) {
        this.root.data = data;
    }
    getRootData() {
        return this.root.data;
    }
    putData(path, data) {
        if (!path) {
            this.putRootData(data);
            return;
        }
        var tree = this.ensureNode(path);
        tree.data = data;
    }
    getData(path) {
        if (!path) {
            return this.getRootData();
        }
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
            return this.getAllData(path.split(/[/\\]/));
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
            // tree = null;
            return false;
        });
        return datas;
    }
    ensureNode(path) {
        if (!Array.isArray(path)) {
            if (Path.sep === '\\')
                path = path.toLowerCase();
            return this.ensureNode(path.split(/[/\\]/));
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
            return this.findNode(path.split(/[/\\]/));
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
    traverse(level = 0, tree, lines = []) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyLXRyZWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kaXItdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsa0RBQTRCO0FBQzVCLDZCQUE4QjtBQVM5QixNQUFhLE9BQU87SUFBcEI7UUFDQyxTQUFJLEdBQWdCLEVBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFDLENBQUM7SUE2R3pDLENBQUM7SUEzR0EsV0FBVyxDQUFDLElBQU87UUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxXQUFXO1FBQ1YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztJQUN2QixDQUFDO0lBRUQsT0FBTyxDQUFDLElBQVksRUFBRSxJQUFPO1FBQzVCLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZCLE9BQU87U0FDUDtRQUNELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFZO1FBQ25CLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVixPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUMxQjtRQUNELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUNoQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVLENBQUMsSUFBdUI7UUFDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDekIs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