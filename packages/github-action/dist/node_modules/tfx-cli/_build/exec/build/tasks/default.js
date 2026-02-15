"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildTaskBase = exports.getCommand = void 0;
const args = require("../../../lib/arguments");
const buildBase = require("../default");
function getCommand(args) {
    return new BuildTaskBase(args);
}
exports.getCommand = getCommand;
class BuildTaskBase extends buildBase.BuildBase {
    constructor() {
        super(...arguments);
        this.description = "Commands for managing Build Tasks.";
        this.serverCommand = false;
    }
    setCommandArgs() {
        super.setCommandArgs();
        this.registerCommandArgument("all", "All Tasks?", "Get all build tasks.", args.BooleanArgument, "false");
        this.registerCommandArgument("taskId", "Task ID", "Identifies a particular Build Task.", args.StringArgument);
        this.registerCommandArgument("taskPath", "Task path", "Local path to a Build Task.", args.ExistingDirectoriesArgument, null);
        this.registerCommandArgument("taskZipPath", "Task zip path", "Local path to an already zipped task", args.StringArgument, null);
        this.registerCommandArgument("overwrite", "Overwrite?", "Overwrite existing Build Task.", args.BooleanArgument, "false");
        this.registerCommandArgument("taskName", "Task Name", "Name of the Build Task.", args.StringArgument);
        this.registerCommandArgument("friendlyName", "Friendly Task Name", null, args.StringArgument);
        this.registerCommandArgument("description", "Task Description", null, args.StringArgument);
        this.registerCommandArgument("author", "Task Author", null, args.StringArgument);
    }
    exec(cmd) {
        return this.getHelp(cmd);
    }
}
exports.BuildTaskBase = BuildTaskBase;
//# sourceMappingURL=default.js.map