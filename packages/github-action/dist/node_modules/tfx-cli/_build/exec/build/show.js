"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildShow = exports.getCommand = void 0;
const buildBase = require("./default");
const buildContracts = require("azure-devops-node-api/interfaces/BuildInterfaces");
const trace = require("../../lib/trace");
function getCommand(args) {
    return new BuildShow(args);
}
exports.getCommand = getCommand;
class BuildShow extends buildBase.BuildBase {
    constructor() {
        super(...arguments);
        this.description = "Show build details.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["project", "buildId"];
    }
    async exec() {
        trace.debug("build-show.exec");
        var buildapi = await this.webApi.getBuildApi();
        return this.commandArgs.project.val().then(project => {
            return this.commandArgs.buildId.val().then(buildId => {
                return buildapi.getBuild(project, buildId);
            });
        });
    }
    friendlyOutput(build) {
        if (!build) {
            throw new Error("no build supplied");
        }
        trace.println();
        trace.info("id              : %s", build.id);
        trace.info("definition name : %s", build.definition ? build.definition.name : "unknown");
        trace.info("requested by    : %s", build.requestedBy ? build.requestedBy.displayName : "unknown");
        trace.info("status          : %s", buildContracts.BuildStatus[build.status]);
        trace.info("queue time      : %s", build.queueTime ? build.queueTime.toJSON() : "unknown");
    }
}
exports.BuildShow = BuildShow;
//# sourceMappingURL=show.js.map