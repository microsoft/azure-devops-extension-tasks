"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib");
const util = require("./Utils");
let publisher = "";
try {
    const connectedService = tl.getInput("ConnectedServiceName", true);
    const token = tl.getEndpointAuthorizationParameter(connectedService, "password", true);
    const vsixFile = tl.getPathInput("vsixFile", true, true);
    const manifestFile = tl.getPathInput("manifestFile", true, true);
    const publisherId = tl.getInput("publisherId", true);
    publisher = publisherId;
    const ignoreWarnings = tl.getInput("ignoreWarnings", false);
    console.info(`Logging in as '${publisherId}'`);
    util.login(publisherId, token);
    console.info(`Publishing '${vsixFile}' to Visual Studio marketplace`);
    util.publish(vsixFile, manifestFile, ignoreWarnings);
}
catch (error) {
    tl.error(error);
    tl.setResult(tl.TaskResult.Failed, error);
}
finally {
    console.info(`Logging out publisher '${publisher}'`);
    util.logout(publisher);
    console.log("All done");
}
//# sourceMappingURL=PublishVSExtension.js.map