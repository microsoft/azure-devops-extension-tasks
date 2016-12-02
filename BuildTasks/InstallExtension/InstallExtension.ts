///<reference path="../typings/index.d.ts" />
import * as tl from "vsts-task-lib/task";
import * as common from "./common";

common.runTfx(tfx => {
    tfx.arg(["extension", "install"]);
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
    tfx.arg(["--accounts"].concat(accounts));

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
        if (err.message.contains("TF1590010")) {
            tl.setResult(tl.TaskResult.Succeeded, "Extension is already installed in the specified account.");
        }
        else {
            tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
        }
    });
});
