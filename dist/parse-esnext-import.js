"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExport = exports.parse = exports.ParseExportInfo = exports.ParseInfo = exports.toAssignment = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtZXNuZXh0LWltcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhcnNlLWVzbmV4dC1pbXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLDREQUF1QjtBQUN2Qiw2QkFBNkI7QUFFN0IsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBRVosU0FBZ0IsWUFBWSxDQUFDLFVBQXFCLEVBQUUsUUFBZ0I7SUFDbkUsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBRWIsSUFBSSxjQUFzQixDQUFDO0lBQzNCLGNBQWMsR0FBRyxPQUFPLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3hDLElBQUksVUFBVSxDQUFDLFVBQVUsRUFBRTtRQUMxQixHQUFHLElBQUksS0FBSyxVQUFVLENBQUMsVUFBVSxNQUFNLGNBQWMsYUFBYSxDQUFDO0tBQ25FO0lBQ0QsSUFBSSxVQUFVLENBQUMsWUFBWSxFQUFFO1FBQzVCLEdBQUcsSUFBSSxLQUFLLFVBQVUsQ0FBQyxZQUFZLE1BQU0sY0FBYyxFQUFFLENBQUM7S0FDMUQ7SUFDRCxnQkFBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3hDLEdBQUcsSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLEtBQUssR0FBRyxjQUFjLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUNsRyxDQUFDLENBQUMsQ0FBQztJQUNILElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDbkIsT0FBTyxPQUFPLGNBQWMsTUFBTSxRQUFRLEdBQUcsR0FBRyxHQUFHLENBQUM7S0FDcEQ7U0FBTTtRQUNOLE9BQU8sUUFBUSxHQUFHLEdBQUcsQ0FBQztLQUN0QjtBQUNGLENBQUM7QUFuQkQsb0NBbUJDO0FBRUQsTUFBYSxTQUFTO0lBQXRCO1FBQ0MsU0FBSSxHQUEwQixFQUFFLENBQUMsQ0FBQywwQkFBMEI7SUFJN0QsQ0FBQztDQUFBO0FBTEQsOEJBS0M7QUFFRCxNQUFhLGVBQWU7SUFBNUI7UUFDQyxhQUFRLEdBQTZCLEVBQUUsQ0FBQyxDQUFDLHVEQUF1RDtJQUVqRyxDQUFDO0NBQUE7QUFIRCwwQ0FHQztBQUVELFNBQWdCLEtBQUssQ0FBQyxHQUFRO0lBQzdCLElBQUksR0FBRyxHQUFjLElBQUksU0FBUyxFQUFFLENBQUM7SUFDckMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBUyxLQUFVO1FBQ3pDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyx3QkFBd0IsRUFBRTtZQUM1QyxHQUFHLENBQUMsVUFBVSxHQUFHLGdCQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztZQUM1QyxPQUFPO1NBQ1A7UUFDRCxJQUFJLFFBQVEsR0FBRyxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFFBQVE7WUFDWixHQUFHLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDOztZQUVwQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUM1QixPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFmRCxzQkFlQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxHQUFRO0lBQ25DLElBQUksR0FBRyxHQUFvQixJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQ2pELEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQVMsS0FBVTtRQUN6QyxJQUFJLElBQUksR0FBRyxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDekMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUNILEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDNUIsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDO0FBUkQsa0NBUUM7QUFFRCxTQUFTLEdBQUc7SUFDWCxPQUFPLEVBQUUsR0FBRyxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyB2YXIge0VPTH0gPSByZXF1aXJlKCdvcycpO1xuXG52YXIgc2VxID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHRvQXNzaWdubWVudChwYXJzZWRJbmZvOiBQYXJzZUluZm8sIHZhbHVlU3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuXHR2YXIgZGVjID0gJyc7XG5cblx0dmFyIGltcG9ydHNWYXJOYW1lOiBzdHJpbmc7XG5cdGltcG9ydHNWYXJOYW1lID0gJ19faW1wJyArIHVpZCgpICsgJ19fJztcblx0aWYgKHBhcnNlZEluZm8uZGVmYXVsdFZhcikge1xuXHRcdGRlYyArPSBgLCAke3BhcnNlZEluZm8uZGVmYXVsdFZhcn0gPSAke2ltcG9ydHNWYXJOYW1lfVtcImRlZmF1bHRcIl1gO1xuXHR9XG5cdGlmIChwYXJzZWRJbmZvLm5hbWVzcGFjZVZhcikge1xuXHRcdGRlYyArPSBgLCAke3BhcnNlZEluZm8ubmFtZXNwYWNlVmFyfSA9ICR7aW1wb3J0c1Zhck5hbWV9YDtcblx0fVxuXHRfLmVhY2gocGFyc2VkSW5mby52YXJzLCAobWVtYmVyLCBuYW1lKSA9PiB7XG5cdFx0ZGVjICs9ICcsICcgKyBuYW1lICsgJyA9ICcgKyBpbXBvcnRzVmFyTmFtZSArICdbJyArIEpTT04uc3RyaW5naWZ5KG1lbWJlciA/IG1lbWJlciA6IG5hbWUpICsgJ10nO1xuXHR9KTtcblx0aWYgKGRlYy5sZW5ndGggPiAwKSB7XG5cdFx0cmV0dXJuIGB2YXIgJHtpbXBvcnRzVmFyTmFtZX0gPSAke3ZhbHVlU3RyfSR7ZGVjfTtgO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB2YWx1ZVN0ciArICc7Jztcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgUGFyc2VJbmZvIHtcblx0dmFyczoge1trOiBzdHJpbmddOiBzdHJpbmd9ID0ge307IC8vIGltcG9ydCB7Zm9vIGFzIGJhciAuLi59XG5cdGRlZmF1bHRWYXI6IHN0cmluZzsgLy8gaW1wb3J0IGZvbyBmcm9tIC4uLlxuXHRuYW1lc3BhY2VWYXI6IHN0cmluZzsgLy8gaW1wb3J0ICogYXMgLi4uXG5cdGZyb206IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFBhcnNlRXhwb3J0SW5mbyB7XG5cdGV4cG9ydGVkOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTsgLy8gRW1wdHkgbWVhbnMgRXhwb3J0QWxsRGVjbGFyYXRpb24gXCJleHBvcnQgKiBmcm9tIC4uLlwiXG5cdGZyb206IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKGFzdDogYW55KTogUGFyc2VJbmZvIHtcblx0dmFyIHJlczogUGFyc2VJbmZvID0gbmV3IFBhcnNlSW5mbygpO1xuXHRhc3Quc3BlY2lmaWVycy5mb3JFYWNoKGZ1bmN0aW9uKHNwZWNpOiBhbnkpIHtcblx0XHRpZiAoc3BlY2kudHlwZSA9PT0gJ0ltcG9ydERlZmF1bHRTcGVjaWZpZXInKSB7XG5cdFx0XHRyZXMuZGVmYXVsdFZhciA9IF8uZ2V0KHNwZWNpLCAnbG9jYWwubmFtZScpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgaW1wb3J0ZWQgPSBfLmdldChzcGVjaSwgJ2ltcG9ydGVkLm5hbWUnKTtcblx0XHRpZiAoIWltcG9ydGVkKVxuXHRcdFx0cmVzLm5hbWVzcGFjZVZhciA9IHNwZWNpLmxvY2FsLm5hbWU7XG5cdFx0ZWxzZVxuXHRcdFx0cmVzLnZhcnNbc3BlY2kubG9jYWwubmFtZV0gPSBpbXBvcnRlZDtcblx0fSk7XG5cdHJlcy5mcm9tID0gYXN0LnNvdXJjZS52YWx1ZTtcblx0cmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRXhwb3J0KGFzdDogYW55KTogUGFyc2VFeHBvcnRJbmZvIHtcblx0dmFyIHJlczogUGFyc2VFeHBvcnRJbmZvID0gbmV3IFBhcnNlRXhwb3J0SW5mbygpO1xuXHRhc3Quc3BlY2lmaWVycy5mb3JFYWNoKGZ1bmN0aW9uKHNwZWNpOiBhbnkpIHtcblx0XHR2YXIgbmFtZSA9IF8uZ2V0KHNwZWNpLCAnZXhwb3J0ZWQubmFtZScpO1xuXHRcdHJlcy5leHBvcnRlZFtuYW1lXSA9IHNwZWNpLmxvY2FsLm5hbWU7XG5cdH0pO1xuXHRyZXMuZnJvbSA9IGFzdC5zb3VyY2UudmFsdWU7XG5cdHJldHVybiByZXM7XG59XG5cbmZ1bmN0aW9uIHVpZCgpIHtcblx0cmV0dXJuICsrc2VxO1xufVxuIl19