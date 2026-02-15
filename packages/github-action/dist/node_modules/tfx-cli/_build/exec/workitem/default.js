"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWorkItemPatchDoc = exports.friendlyOutput = exports.WorkItemBase = exports.getCommand = exports.WorkItemValuesJsonArgument = void 0;
const tfcommand_1 = require("../../lib/tfcommand");
const args = require("../../lib/arguments");
const vssCoreContracts = require("azure-devops-node-api/interfaces/common/VSSInterfaces");
const trace = require("../../lib/trace");
const os_1 = require("os");
const _ = require("lodash");
class WorkItemValuesJsonArgument extends args.JsonArgument {
}
exports.WorkItemValuesJsonArgument = WorkItemValuesJsonArgument;
function getCommand(args) {
    return new WorkItemBase(args);
}
exports.getCommand = getCommand;
class WorkItemBase extends tfcommand_1.TfCommand {
    constructor() {
        super(...arguments);
        this.description = "Commands for managing Work Items.";
        this.serverCommand = false;
    }
    setCommandArgs() {
        super.setCommandArgs();
        this.registerCommandArgument("workItemId", "Work Item ID", "Identifies a particular Work Item.", args.IntArgument);
        this.registerCommandArgument("query", "Work Item Query (WIQL)", null, args.StringArgument);
        this.registerCommandArgument("workItemType", "Work Item Type", "Type of Work Item to create.", args.StringArgument);
        this.registerCommandArgument("assignedTo", "Assigned To", "Who to assign the Work Item to.", args.StringArgument);
        this.registerCommandArgument("title", "Work Item Title", "Title of the Work Item.", args.StringArgument);
        this.registerCommandArgument("description", "Work Item Description", "Description of the Work Item.", args.StringArgument);
        this.registerCommandArgument("values", "Work Item Values", 'Mapping from field reference name to value to set on the workitem. (E.g. {"system.assignedto": "Some Name"})', WorkItemValuesJsonArgument, "{}");
    }
    exec(cmd) {
        return this.getHelp(cmd);
    }
}
exports.WorkItemBase = WorkItemBase;
function friendlyOutput(data) {
    if (!data) {
        throw new Error("no results");
    }
    if (data.length <= 0) {
        return trace.info("Command returned no results.");
    }
    let fieldsToIgnore = [
        "System.Id",
        "System.AreaLevel1",
        "System.IterationId",
        "System.IterationLevel1",
        "System.ExternalLinkCount",
        "System.AreaLevel1",
    ];
    data.forEach(workItem => {
        trace.info(os_1.EOL);
        trace.info("System.Id:          " + workItem.id);
        trace.info("System.Rev:         " + workItem.rev);
        Object.keys(workItem.fields).forEach(arg => {
            if (!_.includes(fieldsToIgnore, arg)) {
                trace.info(arg + ":        " + workItem.fields[arg]);
            }
        });
    });
}
exports.friendlyOutput = friendlyOutput;
function buildWorkItemPatchDoc(title, assignedTo, description, values) {
    var patchDoc = [];
    // Check the convienience helpers for wit values
    if (title) {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/System.Title",
            value: title,
            from: null,
        });
    }
    if (assignedTo) {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/System.AssignedTo",
            value: assignedTo,
            from: null,
        });
    }
    if (description) {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/System.Description",
            value: description,
            from: null,
        });
    }
    // Set the field reference values
    Object.keys(values).forEach(fieldReference => {
        patchDoc.push({
            op: vssCoreContracts.Operation.Add,
            path: "/fields/" + fieldReference,
            value: values[fieldReference],
            from: null,
        });
    });
    return patchDoc;
}
exports.buildWorkItemPatchDoc = buildWorkItemPatchDoc;
//# sourceMappingURL=default.js.map