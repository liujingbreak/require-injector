"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyLXRyZWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9kaXItdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxrREFBNEI7QUFDNUIsNkJBQThCO0FBUzlCLE1BQWEsT0FBTztJQUFwQjtRQUNDLFNBQUksR0FBZ0IsRUFBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUMsQ0FBQztJQThGekMsQ0FBQztJQTVGQSxPQUFPLENBQUMsSUFBWSxFQUFFLElBQU87UUFDNUIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixDQUFDO0lBRUQsT0FBTyxDQUFDLElBQVk7UUFDbkIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVUsQ0FBQyxJQUF1QjtRQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN6QixJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssSUFBSTtnQkFDcEIsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMzQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQzVDO1FBQ0Qsc0JBQXNCO1FBQ3RCLGlCQUFpQjtRQUNqQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3JCLElBQUksS0FBSyxHQUFRLEVBQUUsQ0FBQztRQUNwQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFF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