import * as tl from "azure-pipelines-task-lib/task";
import * as common from "../Common/Common";

async function run() {
    await common.runTfx(tfx => {
        try {
            tfx.arg(["extension", "unpublish", "--no-color"]);

            common.setTfxMarketplaceArguments(tfx, false);
            common.validateAndSetTfxManifestArguments(tfx);
            
            const result = tfx.execSync(<any>{ silent: false, failOnStdErr: false });
            if (result.code != 0) {
                tl.setResult(tl.TaskResult.Failed, "Failed");
            }
            tl.setResult(tl.TaskResult.Succeeded, "Unpublished");
        } catch (err) {
            tl.setResult(tl.TaskResult.Failed, `Failed: ${err}`);
        }
    });
}

void run();