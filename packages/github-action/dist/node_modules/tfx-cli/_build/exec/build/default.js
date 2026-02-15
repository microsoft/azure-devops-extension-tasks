"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildBase = exports.getCommand = void 0;
const tfcommand_1 = require("../../lib/tfcommand");
const args = require("../../lib/arguments");
function getCommand(args) {
    return new BuildBase(args);
}
exports.getCommand = getCommand;
class BuildBase extends tfcommand_1.TfCommand {
    constructor() {
        super(...arguments);
        this.description = "Commands for managing Builds.";
        this.serverCommand = false;
    }
    setCommandArgs() {
        super.setCommandArgs();
        this.registerCommandArgument("definitionId", "Build Definition ID", "Identifies a build definition.", args.IntArgument, null);
        this.registerCommandArgument("definitionName", "Build Definition Name", "Name of a Build Definition.", args.StringArgument, null);
        this.registerCommandArgument("status", "Build Status", "Build status filter.", args.StringArgument, null);
        this.registerCommandArgument("top", "Number of builds", "Maximum number of builds to return.", args.IntArgument, null);
        this.registerCommandArgument("buildId", "Build ID", "Identifies a particular Build.", args.IntArgument);
    }
    exec(cmd) {
        return this.getHelp(cmd);
    }
}
exports.BuildBase = BuildBase;
//# sourceMappingURL=default.js.map