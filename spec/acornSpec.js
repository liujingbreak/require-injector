let acorn = require('acorn');
const fs = require('fs');
const Path = require('path');
const jsx = require("acorn-jsx");
acorn = acorn.Parser.extend(jsx())
// var acornjsx = require('acorn-jsx/inject')(acorn);

var acornImpInject = require('acorn-dynamic-import').default;
acorn = acorn.extend(acornImpInject);
var estraverse = require('estraverse-fb');

describe('acorn walk', () => {
	xit('should walk all AST nodes', ()=> {
		var source = fs.readFileSync(Path.resolve(__dirname, 'acorn-test.jsx'));
		var ast = acorn.parse(source, {locations: true, sourceType: 'module'});
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
