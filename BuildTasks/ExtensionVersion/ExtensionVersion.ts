///<reference path="../typings/main.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");
import stream = require("stream");

const extensionVersionOverrideVariable = tl.getInput("extensionVersionOverride", false);
const outputVariable = tl.getInput("outputVariable", true);
let usingOverride = false;

if (extensionVersionOverrideVariable) {
    tl.debug(`Override variable specified checking for value.`);
    const extensionVersionOverride = tl.getVariable(extensionVersionOverrideVariable);

    if (extensionVersionOverride) {
        tl._writeLine(`Ignoring Marketplace version and using supplied override: ${extensionVersionOverride}.`);
        tl.setVariable(outputVariable, extensionVersionOverride);
        usingOverride = true;
    }
}

if (!usingOverride) {
    common.runTfx(tfx => {
        tfx.arg(["extension", "show", "--json"]);

        // Read gallery endpoint
        const galleryEndpoint = common.getMarketplaceEndpointDetails();
        tfx.arg(["--token", galleryEndpoint.token]);
        tfx.arg(["--service-url", galleryEndpoint.url]);

        // Extension name
        tfx.arg(["--publisher", tl.getInput("publisherId", true)]);
        tfx.arg(["--extension-id", tl.getInput("extensionId", true)]);

        const versionAction = tl.getInput("versionAction", false);

        // Aditional arguments
        tfx.arg(tl.getInput("arguments", false));

        // Set working folder
        const cwd = tl.getInput("cwd", false);
        if (cwd) {
            tl.cd(cwd);
        }

        const outputStream = new common.TfxJsonOutputStream();
        tfx.exec(<any>{ outStream: outputStream, failOnStdErr: true }).then(code => {
            const json = JSON.parse(outputStream.jsonString);
            let version: string = json.versions[json.versions.length - 1].version;

            tl._writeLine(`Latest version   : ${version}.`);
            tl._writeLine(`Requested action : ${versionAction}.`);

            if (versionAction !== "None") {
                let versionparts: number[] = version.split(".").map(v => +v);
                switch (versionAction) {
                    case "Major":
                        versionparts = [versionparts[0] + 1, 0, 0];
                        break;
                    case "Minor":
                        versionparts = [versionparts[0], versionparts[1] + 1, 0];
                        break;
                    case "Patch":
                        versionparts = [versionparts[0], versionparts[1], versionparts[2] + 1];
                        break;
                }
                version = versionparts.join(".");
                tl._writeLine(`Updated to       : ${version}.`);
            }

            tl.setVariable(outputVariable, version);
            tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
        }).fail(err => {
            tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
        });
    });
}