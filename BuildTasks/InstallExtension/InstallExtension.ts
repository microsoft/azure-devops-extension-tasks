///<reference path="../typings/index.d.ts" />
import * as tl from "vsts-task-lib/task";
import * as common from "./common";
import * as os from "os";

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
            let vsixFilePattern = tl.getPathInput("vsixFile", true);
            let matchingVsixFile: string[];
            if (vsixFilePattern.indexOf("*") >= 0 || vsixFilePattern.indexOf("?") >= 0) {
                tl.debug("Pattern found in vsixFile parameter.");
                matchingVsixFile = tl.findMatch(process.cwd(), vsixFilePattern);
            }
            else {
                tl.debug("No pattern found in vsixFile parameter.");
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
            tfx.arg(["--vsix", matchingVsixFile[0]]);
            break;
    }

    // Installation targets
    const accountsArg = tl.getInput("accounts", true);

    // Sanitize accounts list
    const accounts = accountsArg.split(",").map((a) => a.replace(/\s/g, "")).filter(a => a.length > 0);
    tfx.arg(["--accounts"].concat(accounts));

    // Aditional arguments
    tfx.arg(tl.getInput("arguments", false));

    // Set working folder
    const cwd = tl.getInput("cwd", false);
    if (cwd) {
        tl.cd(cwd);
    }

    const result = tfx.execSync(<any>{ silent: false, failOnStdErr: false });
    if (result.stderr.search("error: Error: (?!.*TF1590010)") >= 0) {
        tl.setResult(tl.TaskResult.Failed, "Failed");
    } else {
        tl.setResult(tl.TaskResult.Succeeded, "Succeeded");
    }
});
