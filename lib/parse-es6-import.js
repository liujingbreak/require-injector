var _ = require('lodash');
var EOL = require('os').EOL;

var seq = 0;

exports.parse = parse;

exports.toAssignment = function(parsedInfo, valueStr) {
	var dec = 'var ';
	var i = 0;
	var importsVarName;
	if (parsedInfo.defaultVars.length === 0) {
		importsVarName = '__imp' + uid() + '__';
		dec += importsVarName + ' = ' + valueStr;
		i++;
	} else
		importsVarName = parsedInfo.defaultVars[0];
	_.each(parsedInfo.defaultVars, name => {
		if (i > 0)
			dec += ', ';
		if (i === 0) {
			dec += name + ' = ' + valueStr;
		} else
			dec += name + ' = ' + importsVarName;
		i++;
	});
	_.each(parsedInfo.vars, (member, name) => {
		if (i > 0)
			dec += ', ';
		dec += name + ' = ' + importsVarName + '[' + JSON.stringify(member ? member : name) + ']';
		i++;
	});
	dec += ';';
	return dec;
};

function parse(ast) {
	var res = {vars: {}, from: null, defaultVars: []};
	ast.specifiers.forEach(function(speci) {
		var imported = _.get(speci, 'imported.name');
		if (!imported)
			res.defaultVars.push(speci.local.name);
		else
			res.vars[speci.local.name] = imported;
	});
	res.from = ast.source.value;
	return res;
}

function uid() {
	return ++seq;
}
