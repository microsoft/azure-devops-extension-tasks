import tl from "azure-pipelines-task-lib";
import { AzureRMEndpoint } from "azure-pipelines-tasks-azure-arm-rest/azure-arm-endpoint.js";
import * as util from "./Utils.js";

let publisher = "";

try {
    const connectTo = tl.getInput("connectTo", false) ?? "VsTeam";
    let token: string;
    if (connectTo === "VsTeam") {
        const connectedService = tl.getInput("connectedServiceName", true);
        token = tl.getEndpointAuthorizationParameter(connectedService, "password", true);
    } else {
        const connectedService = tl.getInput("connectedServiceNameAzureRM", true);
        const endpoint = await new AzureRMEndpoint(connectedService).getEndpoint();

        // Overriding the "Active Directory" ID seems to be the only public way to change which scopes the token has access to.
        // https://github.com/microsoft/azure-pipelines-tasks-common-packages/blob/74b799d41d0b78bae6b9ecf9987cf7008093d457/common-npm-packages/azure-arm-rest/azure-arm-common.ts#L480
        endpoint.applicationTokenCredentials.activeDirectoryResourceId = "499b84ac-1321-427f-aa17-267ca6975798";
        token = await endpoint.applicationTokenCredentials.getToken();
    }
    tl.setSecret(token);

    const vsixFile = tl.getPathInput("vsixFile", true, true);
    const manifestFile = tl.getPathInput("manifestFile", true, true);
    const publisherId = tl.getInput("publisherId", true);
    publisher = publisherId;
    const ignoreWarnings = tl.getInput("ignoreWarnings", false);

    console.info(`Logging in as '${publisherId}'`);
    util.login(publisherId, token);

    console.info(`Publishing '${vsixFile}' to Visual Studio marketplace`)
    util.publish(vsixFile, manifestFile, ignoreWarnings);
} catch (error) {
    const { message } = (error as Error);
    tl.error(message);
    tl.setResult(tl.TaskResult.Failed, message);
}
finally {
    console.info(`Logging out publisher '${publisher}'`);
    util.logout(publisher);
    console.log("All done");
}
