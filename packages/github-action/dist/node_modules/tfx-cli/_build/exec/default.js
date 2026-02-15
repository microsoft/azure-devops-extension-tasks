"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultCommand = exports.getCommand = void 0;
const tfcommand_1 = require("../lib/tfcommand");
function getCommand(args) {
    return new DefaultCommand(args);
}
exports.getCommand = getCommand;
class DefaultCommand extends tfcommand_1.TfCommand {
    constructor(passedArgs) {
        super(passedArgs);
        this.serverCommand = false;
    }
    exec(cmd) {
        return this.getHelp(cmd);
    }
}
exports.DefaultCommand = DefaultCommand;
//# sourceMappingURL=default.js.map