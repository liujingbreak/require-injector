export interface TreeNode<T> {
    map: {
        [child: string]: TreeNode<T>;
    };
    name: string;
    data?: T;
}
export declare class DirTree<T> {
    root: TreeNode<T>;
    putData(path: string, data: T): void;
    getData(path: string): T | TreeNode<T>;
    /**
     * @return Array of data
     */
    getAllData(path: string | string[]): T[];
    ensureNode(path: string | string[]): TreeNode<T>;
    findNode(path: string | string[]): TreeNode<T>;
    traverse(level: number, tree: TreeNode<T>, lines: string[]): string | string[];
}
