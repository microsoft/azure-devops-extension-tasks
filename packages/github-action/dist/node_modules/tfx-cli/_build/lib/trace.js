"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = exports.debug = exports.debugArea = exports.warn = exports.info = exports.success = exports.error = exports.println = exports.debugLogStream = exports.traceLevel = void 0;
const colors = require("colors");
const os = require("os");
function isTraceEnabled(envVar) {
    if (!envVar)
        return false;
    const val = envVar.trim().toLowerCase();
    return val === '1' || val === 'true';
}
let debugTracingEnvVar = process.env["TFX_TRACE"];
exports.traceLevel = isTraceEnabled(debugTracingEnvVar) ? 2 /* TraceLevel.Debug */ : 1 /* TraceLevel.Info */;
exports.debugLogStream = console.log;
function println() {
    info("");
}
exports.println = println;
function error(msg, ...replacements) {
    log("error: ", msg, colors.bgRed, replacements, console.error);
}
exports.error = error;
function success(msg, ...replacements) {
    log("", msg, colors.green, replacements);
}
exports.success = success;
function info(msg, ...replacements) {
    if (exports.traceLevel >= 1 /* TraceLevel.Info */) {
        log("", msg, colors.white, replacements);
    }
}
exports.info = info;
function warn(msg, ...replacements) {
    log("warning: ", msg, colors.bgYellow.black, replacements);
}
exports.warn = warn;
function debugArea(msg, area) {
    debugTracingEnvVar = process.env["TFX_TRACE_" + area.toUpperCase()];
    if (debugTracingEnvVar) {
        log(colors.cyan(new Date().toISOString() + " : "), msg, colors.grey, [], exports.debugLogStream);
    }
    debugTracingEnvVar = process.env["TFX_TRACE"];
}
exports.debugArea = debugArea;
function debug(msg, ...replacements) {
    if (exports.traceLevel >= 2 /* TraceLevel.Debug */) {
        log(colors.cyan(new Date().toISOString() + " : "), msg, colors.grey, replacements, exports.debugLogStream);
    }
}
exports.debug = debug;
function log(prefix, msg, color, replacements, method = console.log) {
    var t = typeof msg;
    if (t === "string") {
        write(prefix, msg, color, replacements, method);
    }
    else if (msg instanceof Array) {
        msg.forEach(function (line) {
            if (typeof line === "string") {
                write(prefix, line, color, replacements, method);
            }
        });
    }
    else if (t === "object") {
        write(prefix, JSON.stringify(msg, null, 2), color, replacements, method);
    }
}
function write(prefix, msg, color, replacements, method = console.log) {
    let toLog = format(msg, ...replacements);
    toLog = toLog
        .split(/\n|\r\n/)
        .map(line => prefix + line)
        .join(os.EOL);
    method(color(toLog));
}
function format(str, ...replacements) {
    let lcRepl = str.replace(/%S/g, "%s");
    let split = lcRepl.split("%s");
    if (split.length - 1 !== replacements.length) {
        throw new Error("The number of replacements (" +
            replacements.length +
            ") does not match the number of placeholders (" +
            (split.length - 1) +
            ")");
    }
    let resultArr = [];
    split.forEach((piece, index) => {
        resultArr.push(piece);
        if (index < split.length - 1) {
            resultArr.push(replacements[index]);
        }
    });
    return resultArr.join("");
}
exports.format = format;
//# sourceMappingURL=trace.js.map