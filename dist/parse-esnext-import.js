"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
// var {EOL} = require('os');
var seq = 0;
function toAssignment(parsedInfo, valueStr) {
    var dec = '';
    var importsVarName;
    importsVarName = '__imp' + uid() + '__';
    if (parsedInfo.defaultVar) {
        dec += `, ${parsedInfo.defaultVar} = ${importsVarName}["default"]`;
    }
    if (parsedInfo.namespaceVar) {
        dec += `, ${parsedInfo.namespaceVar} = ${importsVarName}`;
    }
    lodash_1.default.each(parsedInfo.vars, (member, name) => {
        dec += ', ' + name + ' = ' + importsVarName + '[' + JSON.stringify(member ? member : name) + ']';
    });
    if (dec.length > 0) {
        return `var ${importsVarName} = ${valueStr}${dec};`;
    }
    else {
        return valueStr + ';';
    }
}
exports.toAssignment = toAssignment;
class ParseInfo {
    constructor() {
        this.vars = {}; // import {foo as bar ...}
    }
}
exports.ParseInfo = ParseInfo;
class ParseExportInfo {
    constructor() {
        this.exported = {}; // Empty means ExportAllDeclaration "export * from ..."
    }
}
exports.ParseExportInfo = ParseExportInfo;
function parse(ast) {
    var res = new ParseInfo();
    ast.specifiers.forEach(function (speci) {
        if (speci.type === 'ImportDefaultSpecifier') {
            res.defaultVar = lodash_1.default.get(speci, 'local.name');
            return;
        }
        var imported = lodash_1.default.get(speci, 'imported.name');
        if (!imported)
            res.namespaceVar = speci.local.name;
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
        var name = lodash_1.default.get(speci, 'exported.name');
        res.exported[name] = speci.local.name;
    });
    res.from = ast.source.value;
    return res;
}
exports.parseExport = parseExport;
function uid() {
    return ++seq;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtZXNuZXh0LWltcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhcnNlLWVzbmV4dC1pbXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNERBQXVCO0FBQ3ZCLDZCQUE2QjtBQUU3QixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFFWixTQUFnQixZQUFZLENBQUMsVUFBcUIsRUFBRSxRQUFnQjtJQUNuRSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFFYixJQUFJLGNBQXNCLENBQUM7SUFDM0IsY0FBYyxHQUFHLE9BQU8sR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDeEMsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFO1FBQzFCLEdBQUcsSUFBSSxLQUFLLFVBQVUsQ0FBQyxVQUFVLE1BQU0sY0FBYyxhQUFhLENBQUM7S0FDbkU7SUFDRCxJQUFJLFVBQVUsQ0FBQyxZQUFZLEVBQUU7UUFDNUIsR0FBRyxJQUFJLEtBQUssVUFBVSxDQUFDLFlBQVksTUFBTSxjQUFjLEVBQUUsQ0FBQztLQUMxRDtJQUNELGdCQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDeEMsR0FBRyxJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLGNBQWMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ2xHLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNuQixPQUFPLE9BQU8sY0FBYyxNQUFNLFFBQVEsR0FBRyxHQUFHLEdBQUcsQ0FBQztLQUNwRDtTQUFNO1FBQ04sT0FBTyxRQUFRLEdBQUcsR0FBRyxDQUFDO0tBQ3RCO0FBQ0YsQ0FBQztBQW5CRCxvQ0FtQkM7QUFFRCxNQUFhLFNBQVM7SUFBdEI7UUFDQyxTQUFJLEdBQTBCLEVBQUUsQ0FBQyxDQUFDLDBCQUEwQjtJQUk3RCxDQUFDO0NBQUE7QUFMRCw4QkFLQztBQUVELE1BQWEsZUFBZTtJQUE1QjtRQUNDLGFBQVEsR0FBNkIsRUFBRSxDQUFDLENBQUMsdURBQXVEO0lBRWpHLENBQUM7Q0FBQTtBQUhELDBDQUdDO0FBRUQsU0FBZ0IsS0FBSyxDQUFDLEdBQVE7SUFDN0IsSUFBSSxHQUFHLEdBQWMsSUFBSSxTQUFTLEVBQUUsQ0FBQztJQUNyQyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFTLEtBQVU7UUFDekMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLHdCQUF3QixFQUFFO1lBQzVDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzVDLE9BQU87U0FDUDtRQUNELElBQUksUUFBUSxHQUFHLGdCQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsUUFBUTtZQUNaLEdBQUcsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7O1lBRXBDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUM7SUFDeEMsQ0FBQyxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQzVCLE9BQU8sR0FBRyxDQUFDO0FBQ1osQ0FBQztBQWZELHNCQWVDO0FBRUQsU0FBZ0IsV0FBVyxDQUFDLEdBQVE7SUFDbkMsSUFBSSxHQUFHLEdBQW9CLElBQUksZUFBZSxFQUFFLENBQUM7SUFDakQsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBUyxLQUFVO1FBQ3pDLElBQUksSUFBSSxHQUFHLGdCQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN6QyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUM1QixPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFSRCxrQ0FRQztBQUVELFNBQVMsR0FBRztJQUNYLE9BQU8sRUFBRSxHQUFHLENBQUM7QUFDZCxDQUFDIn0=