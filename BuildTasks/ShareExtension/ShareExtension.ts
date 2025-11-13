import tl from "azure-pipelines-task-lib";
import * as common from "../Common/Common.js";
import * as commonAuth from "../Common-Auth/CommonAuth.js";

await common.runTfx(async tfx => {
    tfx.arg(["extension", "share", "--no-color"]);

    await commonAuth.setTfxMarketplaceArguments(tfx);
    common.validateAndSetTfxManifestArguments(tfx);

    // Installation targets
    const accounts = tl.getDelimitedInput("accounts", ",", true);
    tfx.arg(["--share-with"].concat(accounts).map((value) => { return value.trim(); }));

    try {
        const code = await tfx.execAsync();
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }
});
