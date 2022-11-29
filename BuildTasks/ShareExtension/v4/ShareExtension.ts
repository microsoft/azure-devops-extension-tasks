import * as tl from "azure-pipelines-task-lib/task";
import * as common from "../../Common/v4/Common";

void common.runTfx(async tfx => {
    tfx.arg(["extension", "share", "--no-color"]);

    common.setTfxMarketplaceArguments(tfx);
    common.validateAndSetTfxManifestArguments(tfx);

    // Installation targets
    const accounts = tl.getDelimitedInput("accounts", ",", true);
    tfx.arg(["--share-with"].concat(accounts).map((value) => { return value.trim(); }));

    try{
        const code = await tfx.exec();
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    } catch (err)
    {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }
});
