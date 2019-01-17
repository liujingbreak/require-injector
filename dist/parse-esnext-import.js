"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
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
    _.each(parsedInfo.vars, (member, name) => {
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
        if (speci.type === 'ImportDefaultSpecifier') {
            res.defaultVar = _.get(speci, 'local.name');
            return;
        }
        var imported = _.get(speci, 'imported.name');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtZXNuZXh0LWltcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhcnNlLWVzbmV4dC1pbXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsa0RBQTRCO0FBQzVCLDZCQUE2QjtBQUU3QixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFFWixTQUFnQixZQUFZLENBQUMsVUFBcUIsRUFBRSxRQUFnQjtJQUNuRSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFFYixJQUFJLGNBQXNCLENBQUM7SUFDM0IsY0FBYyxHQUFHLE9BQU8sR0FBRyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDeEMsSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFO1FBQzFCLEdBQUcsSUFBSSxLQUFLLFVBQVUsQ0FBQyxVQUFVLE1BQU0sY0FBYyxhQUFhLENBQUM7S0FDbkU7SUFDRCxJQUFJLFVBQVUsQ0FBQyxZQUFZLEVBQUU7UUFDNUIsR0FBRyxJQUFJLEtBQUssVUFBVSxDQUFDLFlBQVksTUFBTSxjQUFjLEVBQUUsQ0FBQztLQUMxRDtJQUNELENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUN4QyxHQUFHLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsY0FBYyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDbEcsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ25CLE9BQU8sT0FBTyxjQUFjLE1BQU0sUUFBUSxHQUFHLEdBQUcsR0FBRyxDQUFDO0tBQ3BEO1NBQU07UUFDTixPQUFPLFFBQVEsR0FBRyxHQUFHLENBQUM7S0FDdEI7QUFDRixDQUFDO0FBbkJELG9DQW1CQztBQUVELE1BQWEsU0FBUztJQUF0QjtRQUNDLFNBQUksR0FBMEIsRUFBRSxDQUFDLENBQUMsMEJBQTBCO1FBRzVELFNBQUksR0FBVyxJQUFJLENBQUM7SUFDckIsQ0FBQztDQUFBO0FBTEQsOEJBS0M7QUFFRCxNQUFhLGVBQWU7SUFBNUI7UUFDQyxhQUFRLEdBQTZCLEVBQUUsQ0FBQyxDQUFDLHVEQUF1RDtRQUNoRyxTQUFJLEdBQVcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7Q0FBQTtBQUhELDBDQUdDO0FBRUQsU0FBZ0IsS0FBSyxDQUFDLEdBQVE7SUFDN0IsSUFBSSxHQUFHLEdBQWMsSUFBSSxTQUFTLEVBQUUsQ0FBQztJQUNyQyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFTLEtBQVU7UUFDekMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLHdCQUF3QixFQUFFO1lBQzVDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDNUMsT0FBTztTQUNQO1FBQ0QsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFFBQVE7WUFDWixHQUFHLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDOztZQUVwQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUM1QixPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFmRCxzQkFlQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxHQUFRO0lBQ25DLElBQUksR0FBRyxHQUFvQixJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQ2pELEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQVMsS0FBVTtRQUN6QyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN6QyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUM1QixPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFSRCxrQ0FRQztBQUVELFNBQVMsR0FBRztJQUNYLE9BQU8sRUFBRSxHQUFHLENBQUM7QUFDZCxDQUFDIn0=