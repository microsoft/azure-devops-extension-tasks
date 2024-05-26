import * as tl from "azure-pipelines-task-lib";
import * as common from "../../Common/v5/Common.js";

await common.runTfx(async tfx => {
    try {
        tfx.arg(["extension", "unpublish", "--no-color"]);

        await common.setTfxMarketplaceArguments(tfx);
        common.validateAndSetTfxManifestArguments(tfx);

        const result = await tfx.execAsync({ silent: false, failOnStdErr: false });
        if (result !== 0) {
            tl.setResult(tl.TaskResult.Failed, "Failed");
        }
        tl.setResult(tl.TaskResult.Succeeded, "Unpublished");
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, `Failed: ${err}`);
    }
});
