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

export async function run() {
    try {
        await common.runTfx(async tfx => {
            tfx.arg(["extension", "show", "--json", "--no-color"]);

            common.setTfxMarketplaceArguments(tfx);
            common.validateAndSetTfxManifestArguments(tfx);

            const versionAction = tl.getInput("versionAction", false);

            const outputStream = new common.TfxJsonOutputStream(false);
            const errStream = new common.TfxJsonOutputStream(false);
            const code = await tfx.exec(<any>{ outStream: outputStream, errStream: errStream, failOnStdErr: true });

            const json = JSON.parse(outputStream.jsonString);
            let version: string = json.versions[0].version;

            console.log(`Latest version   : ${version}.`);
            console.log(`Requested action : ${versionAction}.`);

            if (versionAction !== "None") {
                let versionparts: number[] = version.split(".").map(v => +v);
                switch (versionAction) {
                    case "Major":
                        versionparts = [++versionparts[0], 0, 0];
                        break;
                    case "Minor":
                        versionparts = [versionparts[0], ++versionparts[1], 0];
                        break;
                    case "Patch":
                        versionparts = [versionparts[0], versionparts[1], ++versionparts[2]];
                        break;
                }
                version = versionparts.join(".");
                console.log(`Updated to       : ${version}.`);
            }

            setVersion(version);
            tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
        });
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, `Extension Version task failed: ${err}`);
    }
}

if (!usingOverride) {
    void run();
}