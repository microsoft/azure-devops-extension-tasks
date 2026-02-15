"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.read = void 0;
const prompt = require("prompt");
prompt.delimiter = "";
prompt.message = "> ";
var queue = [];
// This is the read lib that uses Q instead of callbacks.
function read(name, message, silent = false, promptDefault) {
    let promise = new Promise((resolve, reject) => {
        let schema = {
            properties: {},
        };
        schema.properties[name] = {
            hidden: silent,
        };
        if (typeof promptDefault === "undefined") {
            schema.properties[name].required = true;
            schema.properties[name].description = message + ":";
        }
        else {
            schema.properties[name].description = message + " (default = " + promptDefault + ")" + ":";
        }
        Promise.all(queue.filter(x => x !== promise)).then(() => {
            prompt.start();
            prompt.get(schema, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    if (!result || !result[name] || !result[name].trim || !result[name].trim()) {
                        resolve(promptDefault);
                    }
                    else {
                        resolve(result[name]);
                    }
                }
                queue.shift();
            });
        });
    });
    queue.unshift(promise);
    return promise;
}
exports.read = read;
//# sourceMappingURL=qread.js.map