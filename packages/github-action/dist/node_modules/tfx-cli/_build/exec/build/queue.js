"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildQueue = exports.getCommand = exports.describe = void 0;
const buildBase = require("./default");
const buildContracts = require("azure-devops-node-api/interfaces/BuildInterfaces");
const trace = require("../../lib/trace");
function describe() {
    return "queue a build";
}
exports.describe = describe;
function getCommand(args) {
    return new BuildQueue(args);
}
exports.getCommand = getCommand;
class BuildQueue extends buildBase.BuildBase {
    constructor() {
        super(...arguments);
        this.description = "Queue a build.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["project", "definitionId", "definitionName"];
    }
    async exec() {
        var buildapi = await this.webApi.getBuildApi();
        return this.commandArgs.project.val().then(project => {
            return this.commandArgs.definitionId.val(true).then(definitionId => {
                let definitionPromise;
                if (definitionId) {
                    definitionPromise = buildapi.getDefinition(project, definitionId);
                }
                else {
                    definitionPromise = this.commandArgs.definitionName.val().then(definitionName => {
                        trace.debug("No definition id provided, Searching for definitions with name: " + definitionName);
                        return buildapi
                            .getDefinitions(project, definitionName)
                            .then((definitions) => {
                            if (definitions.length > 0) {
                                var definition = definitions[0];
                                return definition;
                            }
                            else {
                                trace.debug("No definition found with name " + definitionName);
                                throw new Error("No definition found with name " + definitionName);
                            }
                        });
                    });
                }
                return definitionPromise.then(definition => {
                    return this._queueBuild(buildapi, definition, project);
                });
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
    _queueBuild(buildapi, definition, project) {
        trace.debug("Queueing build...");
        var build = {
            definition: definition,
        };
        return buildapi.queueBuild(build, project);
    }
}
exports.BuildQueue = BuildQueue;
//# sourceMappingURL=queue.js.map