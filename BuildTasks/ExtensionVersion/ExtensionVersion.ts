///<reference path="../typings/main.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");

common.runTfx(tfx => {
    tfx.arg(["extension", "show", "--json"]);

    // Read gallery endpoint
    const galleryEndpoint = common.getMarketplaceEndpointDetails();
    tfx.arg(["--token", galleryEndpoint.token]);
    tfx.arg(["--service-url", galleryEndpoint.url]);

    // Extension name
    tfx.arg(["--publisher", tl.getInput("publisherId", true)]);
    tfx.arg(["--extension-id", tl.getInput("extensionId", true)]);

    const outputVariable = tl.getInput("outputVariable", false);
    
    // Aditional arguments
    tfx.arg(tl.getInput("arguments", false));

    // Set working folder
    const cwd = tl.getInput("cwd", false);
    if (cwd) {
        tl.cd(cwd);
    }

    const result = tfx.execSync(<any>{ silent: true });
    tl.exitOnCodeIf(result.code, result.code != 0);
    
    const json = JSON.parse(result.stdout)
    const version = json.versions[json.versions.length-1].version;

    tl.setVariable(outputVariable, version);
    tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${result.code}`);
});
