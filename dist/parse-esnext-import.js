"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
// var {EOL} = require('os');
var seq = 0;
function toAssignment(parsedInfo, valueStr) {
    var dec = 'var ';
    var i = 0;
    var importsVarName;
    if (parsedInfo.defaultVars.length === 0) {
        importsVarName = '__imp' + uid() + '__';
        dec += importsVarName + ' = ' + valueStr;
        i++;
    }
    else
        importsVarName = parsedInfo.defaultVars[0];
    _.each(parsedInfo.defaultVars, name => {
        if (i > 0)
            dec += ', ';
        if (i === 0) {
            dec += name + ' = ' + valueStr;
        }
        else
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
exports.toAssignment = toAssignment;
class ParseInfo {
    constructor() {
        this.vars = {};
        this.defaultVars = [];
        this.from = null;
    }
}
exports.ParseInfo = ParseInfo;
class ParseExportInfo {
    constructor() {
        this.exported = {}; // Empty means ExportAllDeclaration "export * from ..."
        this.from = null;
    }
}
exports.ParseExportInfo = ParseExportInfo;
function parse(ast) {
    var res = new ParseInfo();
    ast.specifiers.forEach(function (speci) {
        var imported = _.get(speci, 'imported.name');
        if (!imported)
            res.defaultVars.push(speci.local.name);
        else
            res.vars[speci.local.name] = imported;
    });
    res.from = ast.source.value;
    return res;
}
exports.parse = parse;
function parseExport(ast) {
    var res = new ParseExportInfo();
    ast.specifiers.forEach(function (speci) {
        var name = _.get(speci, 'exported.name');
        res.exported[name] = speci.local.name;
    });
    res.from = ast.source.value;
    return res;
}
exports.parseExport = parseExport;
function uid() {
    return ++seq;
}
//# sourceMappingURL=parse-esnext-import.js.map