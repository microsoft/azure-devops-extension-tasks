"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildGetList = exports.getCommand = void 0;
const buildBase = require("./default");
const buildContracts = require("azure-devops-node-api/interfaces/BuildInterfaces");
const trace = require("../../lib/trace");
function getCommand(args) {
    return new BuildGetList(args);
}
exports.getCommand = getCommand;
class BuildGetList extends buildBase.BuildBase {
    constructor() {
        super(...arguments);
        this.description = "Get a list of builds.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["definitionId", "definitionName", "status", "top", "project"];
    }
    async exec() {
        trace.debug("build-list.exec");
        var buildapi = await this.webApi.getBuildApi();
        return Promise.all([
            this.commandArgs.project.val(),
            this.commandArgs.definitionId.val(),
            this.commandArgs.definitionName.val(),
            this.commandArgs.status.val(),
            this.commandArgs.top.val(),
        ]).then(values => {
            const [project, definitionId, definitionName, status, top] = values;
            var definitions = null;
            if (definitionId) {
                definitions = [definitionId];
            }
            else if (definitionName) {
                trace.debug("No definition Id provided, checking for definitions with name " + definitionName);
                return buildapi
                    .getDefinitions(project, definitionName)
                    .then((defs) => {
                    if (defs.length > 0) {
                        definitions = [defs[0].id];
                        return this._getBuilds(buildapi, project, definitions, buildContracts.BuildStatus[status], top);
                    }
                    else {
                        trace.debug("No definition found with name " + definitionName);
                        throw new Error("No definition found with name " + definitionName);
                    }
                });
            }
            return this._getBuilds(buildapi, project, definitions, buildContracts.BuildStatus[status], top);
        });
    }
    friendlyOutput(data) {
        if (!data) {
            throw new Error("no build supplied");
        }
        if (!(data instanceof Array)) {
            throw new Error("expected an array of builds");
        }
        data.forEach(build => {
            trace.println();
            trace.info("id              : %s", build.id);
            trace.info("definition name : %s", build.definition ? build.definition.name : "unknown");
            trace.info("requested by    : %s", build.requestedBy ? build.requestedBy.displayName : "unknown");
            trace.info("status          : %s", buildContracts.BuildStatus[build.status]);
            trace.info("queue time      : %s", build.queueTime ? build.queueTime.toJSON() : "unknown");
        });
    }
    _getBuilds(buildapi, project, definitions, status, top) {
        // I promise that this was as painful to write as it is to read
        return buildapi.getBuilds(project, definitions, null, null, null, null, null, null, buildContracts.BuildStatus[status], null, null, null, top, null, null, null, null, null, null, null, null);
    }
}
exports.BuildGetList = BuildGetList;
//# sourceMappingURL=list.js.map