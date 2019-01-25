import * as tl from "azure-pipelines-task-lib";
import tr = require("azure-pipelines-task-lib/toolrunner");
import * as util from "./Utils";

let publisher = "";

try {
    let connectedService = tl.getInput("ConnectedServiceName", true);
    let marketplaceUrl = tl.getEndpointUrl(connectedService, false);
    let token = tl.getEndpointAuthorizationParameter(connectedService, "password", true);

    let vsixFile = tl.getPathInput("vsixFile", true, false);
    let rootFolder = tl.getPathInput("rootFolder", false) || tl.getVariable("System.DefaultWorkingDirectory");
    let manifestPattern = tl.getPathInput("manifestPattern", false, false) || "extension.manifest.json";
    let publisherId = tl.getInput("publisherId", true);
    publisher = publisherId;
    let internalName = tl.getInput("internalName", false);
    let extensionVisibility = tl.getInput("extensionVisibility", false);
    let extensionPricing = tl.getInput("extensionPricing", false);
    let ignoreWarnings = tl.getInput("ignoreWarnings", false);

    console.info(`Logging in as '${publisherId}'`);
    util.login(publisherId, token);

    console.info(`Searching for manifest file '${manifestPattern}' in '${rootFolder}'`);
    let manifestPathList = tl.findMatch(rootFolder, manifestPattern);
    if (manifestPathList && manifestPathList.length === 0) {
        throw new Error("Could not find manifest file.");
    }
    let manifestPath = manifestPathList[0];

    console.info(`Found manifest file: ${manifestPath} `)

    console.info(`Publishing '${vsixFile}' to Visual Studio marketplace`)
    util.publish(vsixFile, manifestPath, ignoreWarnings);

} catch (error) {
    tl.error(error);
    tl.setResult(tl.TaskResult.Failed, error);
}
finally {
    console.info(`Logging out publisher '${publisher}'`);
    util.logout(publisher);
    console.log("All done");
}

