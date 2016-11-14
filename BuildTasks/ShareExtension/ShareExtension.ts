///<reference path="../typings/index.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");

common.runTfx(tfx => {
    tfx.arg(["extension", "share"]);
    const method = tl.getInput("method", true);

    common.setTfxMarketplaceArguments(tfx);

    switch (method) {
        case "id":
            // Extension name
            tfx.arg(["--publisher", tl.getInput("publisherId", true)]);
            tfx.arg(["--extension-id", tl.getInput("extensionId", true)]);
            break;

        case "vsix":
            tfx.arg(["--vsix", tl.getInput("vsixFile", true)]);
            break;
    }

    // Installation targets
    const accountsArg = tl.getInput("accounts", true);

    // Sanitize accounts list
    const accounts = accountsArg.split(",").map(a => a.replace(/\s/g, "")).filter(a => a.length > 0);
    tfx.arg(["--share-with", ...accounts]);

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
    });
});
