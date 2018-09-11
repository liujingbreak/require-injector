declare const _default: (content: string, sourcemap: any) => void;
/**
 * Some legacy LESS files reply on npm-import-plugin, which are using convention like
 * "import 'npm://bootstrap/less/bootstrap';" to locate LESS file from node_modules,
 * but with Webpack resolver, it changes to use `@import "~bootstrap/less/bootstrap";`.
 *
 * This loader replaces all "import ... npm://"s with webpack's "import ... ~" style,
 * and works with require-injector to replace package.
 */
export = _default;
