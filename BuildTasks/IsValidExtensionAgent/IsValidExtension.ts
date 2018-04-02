import * as tl from "vsts-task-lib/task";
import * as common from "./common";
import * as stream from "stream";

// common.setProxy();

function run() {
    common.runTfx(tfx => {
        tfx.arg(["version"]);
        tfx.execSync();
    });

    common.runTfx(tfx => {
        tfx.arg(["extension", "isvalid", "--json", "--no-color"]);

        common.setTfxMarketplaceArguments(tfx);
        common.validateAndSetTfxManifestArguments(tfx);

        const outputStream = new common.TfxJsonOutputStream(false);
        tfx.exec(<any>{ outStream: outputStream, failOnStdErr: true }).then(code => {
            const json = JSON.parse(outputStream.jsonString);
            if (json.status === "success") {
                console.log("Extension is valid.");
                tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
            } else {
                console.log("Extension is invalid.");
                tl.setResult(tl.TaskResult.Failed, `tfx exited with return code: ${code}`);
            }
        }).fail(err => {
            tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
        });
    });
}

run();