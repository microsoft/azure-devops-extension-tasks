///<reference path="../typings/main.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");

function getEndpointDetails(inputFieldName) {
    const marketplaceEndpoint = tl.getInput(inputFieldName, true);
    const hostUrl = tl.getEndpointUrl(marketplaceEndpoint, false);
    const auth = tl.getEndpointAuthorization(marketplaceEndpoint, false);

    const apitoken = auth.parameters["password"];

    return {
        "url": hostUrl,
        "token": apitoken
    };
}

common.runTfx(tfx => {
    tfx.arg(["extension", "publish"]);

    // Read gallery endpoint
    const galleryEndpoint = getEndpointDetails("connectedServiceName");
    tfx.arg(["--token", galleryEndpoint.token]);

    tfx.arg(["--service-url", galleryEndpoint.url]);

    // Read file type
    const fileType = tl.getInput("fileType", true);
    let cleanupTfxArgs: () => void;
    if (fileType === "manifest") {
        // Set tfx manifest arguments
        cleanupTfxArgs = common.setTfxManifestArguments(tfx);
    } else {
        // Set vsix file argument
        let vsixFile = tl.getInput("vsixFile", true);
        tfx.arg(["--vsix", vsixFile]);
    }

    // Aditional arguments
    tfx.arg(tl.getInput("arguments", false));

    // Set working folder
    const cwd = tl.getInput("cwd", false);
    if (cwd) {
        tl.cd(cwd);
    }

    tfx.exec().then(code => {
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }).finally(() => {
        if (cleanupTfxArgs) {
            cleanupTfxArgs();
        }
    });
});
