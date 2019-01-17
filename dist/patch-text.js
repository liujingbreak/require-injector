"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const assert = tslib_1.__importStar(require("assert"));
const util = require("util");
class Replacement {
    constructor(start, end, text) {
        this.start = start;
        this.end = end;
        this.text = text;
        assert.notEqual(text, null, 'replacement text should not be null or undefined');
    }
}
exports.Replacement = Replacement;
function _sortAndRemoveOverlap(replacements, removeOverlap = true, text) {
    replacements.sort(function (a, b) {
        return a.start - b.start;
    });
    if (replacements.length < 2)
        return;
    for (let i = 1, l = replacements.length; i < l;) {
        if (replacements[i].start < replacements[i - 1].end) {
            let prev = replacements[i - 1];
            let curr = replacements[i];
            if (removeOverlap) {
                replacements.splice(i, 1);
                l--;
            }
            else {
                throw new Error(`Overlap replacements: 
				"${text.slice(curr.start, curr.end)}" ${util.inspect(curr)}
				and "${text.slice(prev.start, prev.end)}" ${util.inspect(prev)}`);
            }
        }
        else
            i++;
    }
}
exports._sortAndRemoveOverlap = _sortAndRemoveOverlap;
function _replaceSorted(text, replacements) {
    var offset = 0;
    return replacements.reduce((text, update) => {
        var start = update.start + offset;
        var end = update.end + offset;
        var replacement = update.text == null ? update.replacement : update.text;
        offset += (replacement.length - (end - start));
        return text.slice(0, start) + replacement + text.slice(end);
    }, text);
}
exports._replaceSorted = _replaceSorted;
function replaceCode(text, replacements, removeOverlap = false) {
    _sortAndRemoveOverlap(replacements, removeOverlap, text);
    return _replaceSorted(text, replacements);
}
exports.default = replaceCode;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2gtdGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhdGNoLXRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsdURBQWlDO0FBQ2pDLDZCQUE4QjtBQWlCOUIsTUFBYSxXQUFXO0lBQ3ZCLFlBQW1CLEtBQWEsRUFBUyxHQUFXLEVBQzVDLElBQVk7UUFERCxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQVMsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUM1QyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ25CLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxrREFBa0QsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7Q0FDRDtBQUxELGtDQUtDO0FBRUQsU0FBZ0IscUJBQXFCLENBQUMsWUFBOEIsRUFBRSxhQUFhLEdBQUcsSUFBSSxFQUFFLElBQWE7SUFDeEcsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFTLENBQUMsRUFBRSxDQUFDO1FBQzlCLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQzFCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUM7UUFDMUIsT0FBTztJQUNSLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUc7UUFDaEQsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFO1lBQ3BELElBQUksSUFBSSxHQUFHLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLElBQUksYUFBYSxFQUFFO2dCQUNsQixZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxFQUFFLENBQUM7YUFDSjtpQkFBTTtnQkFDTixNQUFNLElBQUksS0FBSyxDQUFDO09BQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztXQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ2xFO1NBQ0Q7O1lBQ0EsQ0FBQyxFQUFFLENBQUM7S0FDTDtBQUNGLENBQUM7QUF0QkQsc0RBc0JDO0FBRUQsU0FBZ0IsY0FBYyxDQUFDLElBQVksRUFBRSxZQUE4QjtJQUMxRSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDZixPQUFPLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFZLEVBQUUsTUFBc0IsRUFBRSxFQUFFO1FBQ25FLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO1FBQ2xDLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDO1FBQzlCLElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ3pFLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMvQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzdELENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNWLENBQUM7QUFURCx3Q0FTQztBQUVELFNBQXdCLFdBQVcsQ0FBQyxJQUFZLEVBQUUsWUFBOEIsRUFBRSxhQUFhLEdBQUcsS0FBSztJQUN0RyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pELE9BQU8sY0FBYyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBSEQsOEJBR0MifQ==