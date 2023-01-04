import * as tl from "azure-pipelines-task-lib/task";
import * as tr from "azure-pipelines-task-lib/toolrunner";
import * as common from "../../Common/v4/Common";

const extensionVersionOverrideVariable = tl.getInput("extensionVersionOverride", false);
let usingOverride = false;

function setVersion(version: string) {
    if (tl.getBoolInput("setBuildNumber", false)) {
        tl.command("build.updatebuildnumber", null, version);
    }

    console.log("Setting output variable '{{StepName}}.Extension.Version'.");
    tl.setVariable("Extension.Version", version, false, true);
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

async function run() {
    try {
        await common.runTfx(async tfx => {
            try {
                tfx.arg(["extension", "show", "--json", "--no-color"]);

                common.setTfxMarketplaceArguments(tfx);
                common.validateAndSetTfxManifestArguments(tfx);

                const versionAction = tl.getInput("versionAction", false);

                const outputStream = new common.TfxJsonOutputStream(console.log);
                const errorStream = new common.TfxJsonOutputStream(tl.error);
            
                const code: number = await tfx.exec(<any>{ outStream: outputStream, errorStream: errorStream, failOnStdErr: false, ignoreReturnCode: false } as tr.IExecOptions);
                if (code !== 0)
                {
                    throw `tfx exited with return code: ${code}`
                }
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
            }
            catch (err){
                tl.setResult(tl.TaskResult.Failed, err);
            }
        });
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, `Extension Version task failed: ${err}`);
    }
}

if (!usingOverride) {
    void run();
}