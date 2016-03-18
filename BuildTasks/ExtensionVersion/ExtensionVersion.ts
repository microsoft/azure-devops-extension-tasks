///<reference path="../typings/main.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");
import jsonpath = require("jsonpath");

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

    var capturedOutput = ""
    tfx.exec(<any>{stdout: output => { capturedOutput += output }})
    .then(code => {
        var version = jsonpath.value(capturedOutput, "$.versions[-1:].version", "0.0.1");
        tl.setVariable(outputVariable, version);
        
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    })


    tfx.exec().then( code => {
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }
   
    ).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    });
});
