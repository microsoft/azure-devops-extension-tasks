///<reference path="../typings/index.d.ts" />
import * as tl from "vsts-task-lib/task";
import * as common from "./common";

common.runTfx(tfx => {
    tfx.arg(["extension", "share"]);

    common.setTfxMarketplaceArguments(tfx);
    common.validateAndSetTfxManifestArguments(tfx);

    // Installation targets
    const accounts = tl.getDelimitedInput("accounts", ",", true);
    tfx.arg(["--share-with"].concat(accounts));

    tfx.exec().then(code => {
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    });
});
