import * as tl from "vsts-task-lib/task";
import * as common from "./common";

const extensionVersionOverrideVariable = tl.getInput("extensionVersionOverride", false);
let usingOverride = false;

function setVersion(version: string) {
    if (tl.getBoolInput("setBuildNumber", false)) {
        tl.command("build.updatebuildnumber", null, version);
    }

    const outputVariable = tl.getInput("outputVariable", false);
    if (outputVariable) {
        tl.setVariable(outputVariable, version);
    }
}

if (extensionVersionOverrideVariable) {
    tl.debug(`Override variable specified checking for value.`);
    const version = tl.getVariable(extensionVersionOverrideVariable);

    if (version) {
        console.log(`Ignoring Marketplace version and using supplied override: ${version}.`);
        setVersion(version);
        usingOverride = true;
    }
}

// common.setProxy();

if (!usingOverride) {
    common.runTfx(tfx => {
        tfx.arg(["extension", "show", "--json", "--no-color"]);

        common.setTfxMarketplaceArguments(tfx);
        common.validateAndSetTfxManifestArguments(tfx);

        const versionAction = tl.getInput("versionAction", false);

        const outputStream = new common.TfxJsonOutputStream(false);
        tfx.exec(<any>{ outStream: outputStream, failOnStdErr: true }).then(code => {
            const json = JSON.parse(outputStream.jsonString);
            let version: string = json.versions[0].version;

            console.log(`Latest version   : ${version}.`);
            console.log(`Requested action : ${versionAction}.`);

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
                console.log(`Updated to       : ${version}.`);
            }

            setVersion(version);
            tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
        }).fail(err => {
            tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
        });
    });
}