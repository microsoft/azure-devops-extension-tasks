"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = void 0;
const common = require("./common");
const fsUtils = require("./fsUtils");
const path = require("path");
const trace = require("./trace");
const util_1 = require("util");
const fs_1 = require("fs");
/**
 * Load the module given by execPath and instantiate a TfCommand using args.
 * @param {string[]} execPath: path to the module to load. This module must implement CommandFactory.
 * @param {string[]} args: args to pass to the command factory to instantiate the TfCommand
 * @return {Promise<TfCommand>} Promise that is resolved with the module's command
 */
function load(execPath, args) {
    trace.debug("loader.load");
    let commandModulePath = path.resolve(common.APP_ROOT, "exec", execPath.join("/"));
    return fsUtils.exists(commandModulePath).then(exists => {
        let resolveDefaultPromise = Promise.resolve(commandModulePath);
        if (exists) {
            // If this extensionless path exists, it should be a directory.
            // If the path doesn't exist, for now we assume that a file with a .js extension
            // exists (if it doens't, we will find out below).
            resolveDefaultPromise = (0, util_1.promisify)(fs_1.lstat)(commandModulePath).then(stats => {
                if (stats.isDirectory()) {
                    return path.join(commandModulePath, "default");
                }
                return commandModulePath;
            });
        }
        return resolveDefaultPromise.then((commandModulePath) => {
            let commandModule;
            return fsUtils.exists(path.resolve(commandModulePath + ".js")).then(exists => {
                if (!exists) {
                    throw new Error(commandModulePath + " is not a recognized command. Run with --help to see available commands.");
                }
                try {
                    commandModule = require(commandModulePath);
                }
                catch (e) {
                    trace.error(commandModulePath + " could not be fully loaded as a tfx command.");
                    throw e;
                }
                if (!commandModule.getCommand) {
                    throw new Error("Command modules must export a function, getCommand, that takes no arguments and returns an instance of TfCommand");
                }
                return commandModule.getCommand(args);
            });
        });
    });
}
exports.load = load;
//# sourceMappingURL=loader.js.map