"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkItemQuery = exports.getCommand = void 0;
const witBase = require("./default");
const witContracts = require("azure-devops-node-api/interfaces/WorkItemTrackingInterfaces");
function getCommand(args) {
    return new WorkItemQuery(args);
}
exports.getCommand = getCommand;
class WorkItemQuery extends witBase.WorkItemBase {
    constructor() {
        super(...arguments);
        this.description = "Get a list of Work Items given a query";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["project", "query"];
    }
    async exec() {
        var witApi = await this.webApi.getWorkItemTrackingApi();
        return this.commandArgs.project.val(true).then(projectName => {
            return this.commandArgs.query.val().then(query => {
                let wiql = { query: query };
                return witApi.queryByWiql(wiql, { project: projectName }).then(result => {
                    let workItemIds = [];
                    // Flat Query
                    if (result.queryType == witContracts.QueryType.Flat) {
                        workItemIds = result.workItems.map(val => val.id).slice(0, Math.min(200, result.workItems.length));
                    }
                    // Link Query
                    else {
                        let sourceIds = result.workItemRelations
                            .filter(relation => relation.source && relation.source.id)
                            .map(relation => relation.source.id);
                        let targetIds = result.workItemRelations
                            .filter(relation => relation.target && relation.target.id)
                            .map(relation => relation.target.id);
                        let allIds = sourceIds.concat(targetIds);
                        workItemIds = allIds.slice(0, Math.min(200, allIds.length));
                    }
                    let fieldRefs = result.columns.map(val => val.referenceName);
                    fieldRefs = fieldRefs.slice(0, Math.min(20, result.columns.length));
                    return workItemIds.length > 0 ? witApi.getWorkItems(workItemIds, fieldRefs) : [];
                });
            });
        });
    }
    friendlyOutput(data) {
        return witBase.friendlyOutput(data);
    }
}
exports.WorkItemQuery = WorkItemQuery;
//# sourceMappingURL=query.js.map