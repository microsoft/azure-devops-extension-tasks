"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkItemUpdate = exports.getCommand = void 0;
const witBase = require("./default");
function getCommand(args) {
    return new WorkItemUpdate(args);
}
exports.getCommand = getCommand;
class WorkItemUpdate extends witBase.WorkItemBase {
    constructor() {
        super(...arguments);
        this.description = "Update a Work Item.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["workItemId", "title", "assignedTo", "description", "values"];
    }
    async exec() {
        var witapi = await this.webApi.getWorkItemTrackingApi();
        return Promise.all([
            this.commandArgs.workItemId.val(),
            this.commandArgs.title.val(true),
            this.commandArgs.assignedTo.val(true),
            this.commandArgs.description.val(true),
            this.commandArgs.values.val(true),
        ]).then(promiseValues => {
            const [workItemId, title, assignedTo, description, values] = promiseValues;
            if (!title && !assignedTo && !description && (!values || Object.keys(values).length <= 0)) {
                throw new Error("At least one field value must be specified.");
            }
            var patchDoc = witBase.buildWorkItemPatchDoc(title, assignedTo, description, values);
            return witapi.updateWorkItem(null, patchDoc, workItemId);
        });
    }
    friendlyOutput(workItem) {
        return witBase.friendlyOutput([workItem]);
    }
}
exports.WorkItemUpdate = WorkItemUpdate;
//# sourceMappingURL=update.js.map