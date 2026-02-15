"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Version = exports.getCommand = void 0;
const tfcommand_1 = require("../lib/tfcommand");
const version = require("../lib/version");
const trace = require("../lib/trace");
function getCommand(args) {
    return new Version(args);
}
exports.getCommand = getCommand;
class Version extends tfcommand_1.TfCommand {
    getHelpArgs() {
        return [];
    }
    constructor(args) {
        super(args);
        this.description = "Output the version of this tool.";
        this.serverCommand = false;
    }
    async exec() {
        trace.debug("version.exec");
        return version.getTfxVersion();
    }
    friendlyOutput(data) {
        trace.info("Version %s", data.toString());
    }
}
exports.Version = Version;
//# sourceMappingURL=version.js.map