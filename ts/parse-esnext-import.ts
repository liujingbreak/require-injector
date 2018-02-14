import * as _ from 'lodash';
// var {EOL} = require('os');

var seq = 0;

export function toAssignment(parsedInfo: ParseInfo, valueStr: string): string {
	var dec = 'var ';
	var i = 0;
	var importsVarName: string;
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
}

export class ParseInfo {
	vars: {[k: string]: string} = {};
	defaultVars: string[] = [];
	from: string = null;
}

export class ParseExportInfo {
	exported: {[name: string]: string} = {}; // Empty means ExportAllDeclaration "export * from ..."
	from: string = null;
}

export function parse(ast: any): ParseInfo{
	var res: ParseInfo = new ParseInfo();
	ast.specifiers.forEach(function(speci: any) {
		var imported = _.get(speci, 'imported.name');
		if (!imported)
			res.defaultVars.push(speci.local.name);
		else
			res.vars[speci.local.name] = imported;
	});
	res.from = ast.source.value;
	return res;
}

export function parseExport(ast: any): ParseExportInfo {
	var res: ParseExportInfo = new ParseExportInfo();
	ast.specifiers.forEach(function(speci: any) {
		var name = _.get(speci, 'exported.name');
		res.exported[name] = speci.local.name;
	});
	res.from = ast.source.value;
	return res;
}

function uid() {
	return ++seq;
}
