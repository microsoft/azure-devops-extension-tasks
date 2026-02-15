"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repeatStr = exports.newGuid = exports.endsWith = exports.EXEC_PATH = exports.NO_PROMPT = exports.APP_ROOT = void 0;
function endsWith(str, end) {
    return str.slice(-end.length) == end;
}
exports.endsWith = endsWith;
/**
 * Generate a new rfc4122 version 4 compliant GUID.
 */
function newGuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0, v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.newGuid = newGuid;
/**
 * Repeat a string <count> times.
 */
function repeatStr(str, count) {
    let result = [];
    for (let i = 0; i < count; ++i) {
        result.push(str);
    }
    return result.join("");
}
exports.repeatStr = repeatStr;
//# sourceMappingURL=common.js.map