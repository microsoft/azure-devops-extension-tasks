"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildTaskDelete = exports.getCommand = void 0;
const tasksBase = require("./default");
const trace = require("../../../lib/trace");
function getCommand(args) {
    return new BuildTaskDelete(args);
}
exports.getCommand = getCommand;
class BuildTaskDelete extends tasksBase.BuildTaskBase {
    constructor() {
        super(...arguments);
        this.description = "Delete a Build Task.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["taskId"];
    }
    async exec() {
        let agentApi = await this.webApi.getTaskAgentApi(this.connection.getCollectionUrl());
        return this.commandArgs.taskId.val().then(taskId => {
            return agentApi.getTaskDefinitions(taskId).then(tasks => {
                if (tasks && tasks.length > 0) {
                    trace.debug("Deleting task(s)...");
                    return agentApi.deleteTaskDefinition(taskId).then(() => {
                        return {
                            id: taskId,
                        };
                    });
                }
                else {
                    trace.debug("No such task.");
                    throw new Error("No task found with provided ID: " + taskId);
                }
            });
        });
    }
    friendlyOutput(data) {
        trace.println();
        trace.success("Task %s deleted successfully!", data.id);
    }
}
exports.BuildTaskDelete = BuildTaskDelete;
//# sourceMappingURL=delete.js.map