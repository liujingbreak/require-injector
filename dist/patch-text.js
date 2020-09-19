"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._replaceSorted = exports._sortAndRemoveOverlap = exports.Replacement = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2gtdGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhdGNoLXRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLHVEQUFpQztBQUNqQyw2QkFBOEI7QUFpQjlCLE1BQWEsV0FBVztJQUN2QixZQUFtQixLQUFhLEVBQVMsR0FBVyxFQUM1QyxJQUFZO1FBREQsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDNUMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNuQixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsa0RBQWtELENBQUMsQ0FBQztJQUNqRixDQUFDO0NBQ0Q7QUFMRCxrQ0FLQztBQUVELFNBQWdCLHFCQUFxQixDQUFDLFlBQThCLEVBQUUsYUFBYSxHQUFHLElBQUksRUFBRSxJQUFZO0lBQ3ZHLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBUyxDQUFDLEVBQUUsQ0FBQztRQUM5QixPQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDO1FBQzFCLE9BQU87SUFDUixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1FBQ2hELElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUNwRCxJQUFJLElBQUksR0FBRyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQy9CLElBQUksSUFBSSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixJQUFJLGFBQWEsRUFBRTtnQkFDbEIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUMsRUFBRSxDQUFDO2FBQ0o7aUJBQU07Z0JBQ04sTUFBTSxJQUFJLEtBQUssQ0FBQztPQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7V0FDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNsRTtTQUNEOztZQUNBLENBQUMsRUFBRSxDQUFDO0tBQ0w7QUFDRixDQUFDO0FBdEJELHNEQXNCQztBQUVELFNBQWdCLGNBQWMsQ0FBQyxJQUFZLEVBQUUsWUFBOEI7SUFDMUUsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsT0FBTyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBWSxFQUFFLE1BQXNCLEVBQUUsRUFBRTtRQUNuRSxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUNsQyxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQztRQUM5QixJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUN6RSxNQUFNLElBQUksQ0FBQyxXQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDaEQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxXQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5RCxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDVixDQUFDO0FBVEQsd0NBU0M7QUFFRCxTQUF3QixXQUFXLENBQUMsSUFBWSxFQUFFLFlBQThCLEVBQUUsYUFBYSxHQUFHLEtBQUs7SUFDdEcscUJBQXFCLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6RCxPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUhELDhCQUdDIn0=