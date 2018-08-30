import * as _ from 'lodash';
import Path = require('path');
// const os = require('os');
// var isWin32 = os.platform().indexOf('win32') >= 0;

export interface TreeNode<T> {
	map: {[child: string]: TreeNode<T>};
	name: string;
	data?: T;
}
export class DirTree<T> {
	root: TreeNode<T> = {map: {}, name: ''};

	putData(path: string, data: T) {
		var tree = this.ensureNode(path);
		tree.data = data;
	}

	getData(path: string) {
		var tree = this.findNode(path);
		return tree ? tree.data : tree;
	}

	/**
	 * @return Array of data
	 */
	getAllData(path: string | string[]): T[] {
		if (!Array.isArray(path)) {
			if (Path.sep === '\\')
				path = path.toLowerCase();
			return this.getAllData(path.replace(/\\/g, '/').split('/'));
		}
		// if (path[0] === '')
		// 	path.shift();
		var tree = this.root;
		var datas: T[] = [];
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

	ensureNode(path: string | string[]): TreeNode<T> {
		if (!Array.isArray(path)) {
			if (Path.sep === '\\')
				path = path.toLowerCase();
			return this.ensureNode(path.replace(/\\/g, '/').split('/'));
		}
		var tree = this.root;
		_.each(path, name => {
			if (_.has(tree, ['map', name])) {
				tree = tree.map[name];
			} else {
				var child = {map: {}, name: name};
				tree.map[name] = child;
				tree = child;
			}
		});
		return tree;
	}

	findNode(path: string | string[]): TreeNode<T> {
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

	traverse(level: number, tree: TreeNode<T>, lines: string[]) {
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
};
