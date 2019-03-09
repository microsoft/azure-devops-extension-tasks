import * as tl from "azure-pipelines-task-lib";
import tr = require("azure-pipelines-task-lib/toolrunner");
import * as util from "./Utils";

let publisher = "";

try {
    let connectedService = tl.getInput("connectedServiceName", true);
    let token = tl.getEndpointAuthorizationParameter(connectedService, "password", true);

    let vsixFile = tl.getPathInput("vsixFile", true, true);
    let manifestFile = tl.getPathInput("manifestFile", true, true);
    let publisherId = tl.getInput("publisherId", true);
    publisher = publisherId;
    let ignoreWarnings = tl.getInput("ignoreWarnings", false);

    console.info(`Logging in as '${publisherId}'`);
    util.login(publisherId, token);

    console.info(`Publishing '${vsixFile}' to Visual Studio marketplace`)
    util.publish(vsixFile, manifestFile, ignoreWarnings);
} catch (error) {
    tl.error(error);
    tl.setResult(tl.TaskResult.Failed, error);
}
finally {
    console.info(`Logging out publisher '${publisher}'`);
    util.logout(publisher);
    console.log("All done");
}