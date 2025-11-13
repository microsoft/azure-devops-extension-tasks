import tl from "azure-pipelines-task-lib";
import { ToolRunner } from "azure-pipelines-task-lib/toolrunner.js";
import { AzureRMEndpoint } from "azure-pipelines-tasks-azure-arm-rest/azure-arm-endpoint.js";

export function getMarketplaceEndpointDetails(inputFieldName: string): {
    url: string;
    username: string;
    password: string;
    apitoken: string;
} {
    const marketplaceEndpoint = tl.getInput(inputFieldName, true);

    const hostUrl = tl.getEndpointUrl(marketplaceEndpoint, false);
    const auth = tl.getEndpointAuthorization(marketplaceEndpoint, false);
    const password = auth.parameters["password"];
    const username = auth.parameters["username"];
    const apitoken = auth.parameters["apitoken"];

    return {
        url: hostUrl,
        username: username,
        password: password,
        apitoken: apitoken
    };
}

export async function setTfxMarketplaceArguments(tfx: ToolRunner, setServiceUrl = true): Promise<void> {
    const connectTo = tl.getInput("connectTo", false) || "VsTeam";

    if (connectTo === "VsTeam") {
        const galleryEndpoint = getMarketplaceEndpointDetails("connectedServiceName");
        tl.setSecret(galleryEndpoint.password);
        tfx.argIf(setServiceUrl, ["--service-url", galleryEndpoint.url]);
        tfx.arg(["--auth-type", "pat"]);
        tfx.arg(["--token", galleryEndpoint.password]);
    }
    else if (connectTo === "AzureRM") {
        const serviceName = tl.getInput("connectedServiceNameAzureRM", true);
        const endpoint = await new AzureRMEndpoint(serviceName).getEndpoint();

        // Ensure the access token includes Marketplace scopes.
        endpoint.applicationTokenCredentials.activeDirectoryResourceId = "499b84ac-1321-427f-aa17-267ca6975798";
        const token = await endpoint.applicationTokenCredentials.getToken();
        tfx.argIf(setServiceUrl, ["--service-url", "https://marketplace.visualstudio.com"]);
        tfx.arg(["--auth-type", "pat"]);
        tfx.arg(["--token", token]);
        tl.setSecret(token);
    }
    else {
        const galleryEndpoint = getMarketplaceEndpointDetails("connectedServiceNameTFS");
        tfx.argIf(setServiceUrl, ["--service-url", galleryEndpoint.url]);

        if (galleryEndpoint.username) {
            tfx.arg(["--auth-type", "basic"]);
            tfx.arg(["--username", galleryEndpoint.username]);
            tfx.arg(["--password", galleryEndpoint.password]);
            tl.setSecret(galleryEndpoint.password);
        }
        else {
            tfx.arg(["--auth-type", "pat"]);
            tfx.arg(["--token", galleryEndpoint.apitoken]);
            tl.setSecret(galleryEndpoint.apitoken);
        }
    }
}

export default {
    getMarketplaceEndpointDetails,
    setTfxMarketplaceArguments
};