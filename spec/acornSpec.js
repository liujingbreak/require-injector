const acorn = require('acorn');
const walk = require('acorn/dist/walk');
const fs = require('fs');
const Path = require('path');
var acornjsx = require('acorn-jsx/inject')(acorn);

var acornImpInject = require('acorn-dynamic-import/lib/inject').default;
acornjsx = acornImpInject(acornjsx);
var estraverse = require('estraverse-fb');

describe('acorn walk', () => {
	it('should walk all AST nodes', ()=> {
		var source = fs.readFileSync(Path.resolve(__dirname, 'acorn-test.jsx'));
		var ast = acornjsx.parse(source, {locations: true, sourceType: 'module', plugins: {jsx: true, dynamicImport: true}});
		console.log(JSON.stringify(ast, null, ' '));
		estraverse.traverse(ast, {
			enter: function(node, parent) {
				console.log(node.type);
			},
			keys: {
				Import: [],
				JSXText: []
			}
		});
		// walk.simple(ast, {
		// 	FunctionDeclaration: node => {
		// 		console.log('simple walk nod ', node);
		// 	},
		// 	JSXElement: node => {
		// 		console.log('jsx', node);
		// 	}
		// });
	});
});
