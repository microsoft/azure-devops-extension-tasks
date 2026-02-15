"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkItemShow = exports.getCommand = void 0;
const witBase = require("./default");
function getCommand(args) {
    return new WorkItemShow(args);
}
exports.getCommand = getCommand;
class WorkItemShow extends witBase.WorkItemBase {
    constructor() {
        super(...arguments);
        this.description = "Show Work Item details.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["workItemId"];
    }
    async exec() {
        var witapi = await this.webApi.getWorkItemTrackingApi();
        return this.commandArgs.workItemId.val().then(workItemId => {
            return witapi.getWorkItem(workItemId);
        });
    }
    friendlyOutput(workItem) {
        return witBase.friendlyOutput([workItem]);
    }
}
exports.WorkItemShow = WorkItemShow;
//# sourceMappingURL=show.js.map