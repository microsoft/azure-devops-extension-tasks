"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reset = exports.getCommand = void 0;
const tfcommand_1 = require("../lib/tfcommand");
const diskcache_1 = require("../lib/diskcache");
const os_1 = require("os");
const args = require("../lib/arguments");
const path = require("path");
const trace = require("../lib/trace");
function getCommand(args) {
    return new Reset(args);
}
exports.getCommand = getCommand;
class Reset extends tfcommand_1.TfCommand {
    getHelpArgs() {
        return ["all"];
    }
    constructor(args) {
        super(args);
        this.description = "Reset any saved options to their defaults.";
        this.serverCommand = false;
    }
    setCommandArgs() {
        super.setCommandArgs();
        this.registerCommandArgument("all", "All directories", "Pass this option to reset saved options for all directories.", args.BooleanArgument, "false");
    }
    async exec() {
        return Promise.resolve(null);
    }
    dispose() {
        let currentPath = path.resolve();
        return this.commandArgs.all.val().then(allSettings => {
            return args.getOptionsCache().then(existingCache => {
                if (existingCache[currentPath]) {
                    existingCache[currentPath] = {};
                    return new diskcache_1.DiskCache("tfx").setItem("cache", "command-options", allSettings ? "" : JSON.stringify(existingCache, null, 4).replace(/\n/g, os_1.EOL));
                }
                else {
                    return Promise.resolve(null);
                }
            });
        });
    }
    friendlyOutput() {
        trace.success("Settings reset.");
    }
}
exports.Reset = Reset;
//# sourceMappingURL=reset.js.map