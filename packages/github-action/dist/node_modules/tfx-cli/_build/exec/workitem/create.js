"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkItemCreate = exports.getCommand = void 0;
const witBase = require("./default");
function getCommand(args) {
    return new WorkItemCreate(args);
}
exports.getCommand = getCommand;
class WorkItemCreate extends witBase.WorkItemBase {
    constructor() {
        super(...arguments);
        this.description = "Create a Work Item.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["workItemType", "title", "assignedTo", "description", "project", "values"];
    }
    async exec() {
        var witapi = await this.webApi.getWorkItemTrackingApi();
        return Promise.all([
            this.commandArgs.workItemType.val(),
            this.commandArgs.project.val(),
            this.commandArgs.title.val(true),
            this.commandArgs.assignedTo.val(true),
            this.commandArgs.description.val(true),
            this.commandArgs.values.val(true),
        ]).then(promiseValues => {
            const [wiType, project, title, assignedTo, description, values] = promiseValues;
            if (!title && !assignedTo && !description && (!values || Object.keys(values).length <= 0)) {
                throw new Error("At least one field value must be specified.");
            }
            var patchDoc = witBase.buildWorkItemPatchDoc(title, assignedTo, description, values);
            return witapi.createWorkItem(null, patchDoc, project, wiType);
        });
    }
    friendlyOutput(workItem) {
        return witBase.friendlyOutput([workItem]);
    }
}
exports.WorkItemCreate = WorkItemCreate;
//# sourceMappingURL=create.js.map