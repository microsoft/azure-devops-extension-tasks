///<reference path="../typings/index.d.ts" />
import * as tl from "vsts-task-lib/task";
import * as common from "./common";

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
            let vsixFilePattern = tl.getPathInput("vsixFile", true);
            let matchingVsixFile: string[];
            if (vsixFilePattern.indexOf("*") >= 0 || vsixFilePattern.indexOf("?") >= 0) {
                tl.debug("Pattern found in vsixFile parameter");
                matchingVsixFile = tl.findMatch(process.cwd(), vsixFilePattern);
            }
            else {
                tl.debug("No pattern found in vsixFile parameter");
                matchingVsixFile = [vsixFilePattern];
            }

            if (!matchingVsixFile || matchingVsixFile.length === 0) {
                tl.setResult(tl.TaskResult.Failed, `Found no vsix files matching: ${vsixFilePattern}.`);
                return false;
            }
            if (matchingVsixFile.length !== 1) {
                tl.setResult(tl.TaskResult.Failed, `Found multiple vsix files matching: ${vsixFilePattern}.`);
                return false;
            }

            const vsixFile = matchingVsixFile[0];
            tl.checkPath(vsixFile, "vsixPath");

            tfx.arg(["--vsix", vsixFile]);
            break;
    }

    // Installation targets
    const accountsArg = tl.getInput("accounts", true);

    // Sanitize accounts list
    const accounts = accountsArg.split(",").map(a => a.replace(/\s/g, "")).filter(a => a.length > 0);
    tfx.arg(["--share-with"].concat(accounts));

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
