"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommand = void 0;
const common = require("./common");
const path = require("path");
const fs_1 = require("fs");
const util_1 = require("util");
function getCommand() {
    let args = process.argv.slice(2);
    return getCommandHierarchy(path.resolve(common.APP_ROOT, "exec")).then(hierarchy => {
        let execPath = [];
        let commandArgs = [];
        let currentHierarchy = hierarchy;
        let inArgs = false;
        args.forEach(arg => {
            if (arg.substr(0, 1) === "-" || inArgs) {
                commandArgs.push(arg);
                inArgs = true;
            }
            else if (currentHierarchy && currentHierarchy[arg] !== undefined) {
                currentHierarchy = currentHierarchy[arg];
                execPath.push(arg);
            }
            else {
                throw "Command '" + arg + "' not found. For help, type tfx " + execPath.join(" ") + " --help";
            }
        });
        return {
            execPath: execPath,
            args: commandArgs,
            commandHierarchy: hierarchy,
        };
    });
}
exports.getCommand = getCommand;
function getCommandHierarchy(root) {
    let hierarchy = {};
    return (0, util_1.promisify)(fs_1.readdir)(root).then(files => {
        let filePromises = [];
        files.forEach(file => {
            if (file.startsWith("_") || file.endsWith(".map")) {
                return;
            }
            let fullPath = path.resolve(root, file);
            let parsedPath = path.parse(fullPath);
            let promise = (0, util_1.promisify)(fs_1.lstat)(fullPath).then(stats => {
                if (stats.isDirectory()) {
                    return getCommandHierarchy(fullPath).then(subHierarchy => {
                        hierarchy[parsedPath.name] = subHierarchy;
                    });
                }
                else {
                    hierarchy[parsedPath.name] = null;
                    return null;
                }
            });
            filePromises.push(promise);
        });
        return Promise.all(filePromises).then(() => {
            return hierarchy;
        });
    });
}
//# sourceMappingURL=command.js.map