///<reference path="../typings/index.d.ts" />
import * as tl from "vsts-task-lib/task";
import * as common from "./common";
import * as os from "os";

common.runTfx(tfx => {
    tfx.arg(["extension", "install"]);

    common.setTfxMarketplaceArguments(tfx);
    common.validateAndSetTfxManifestArguments(tfx);

    // Installation targets
    const accounts = tl.getDelimitedInput("accounts", ",", true);
    tfx.arg(["--accounts"].concat(accounts).map((value, index) => { return value.trim(); }));

    const result = tfx.execSync(<any>{ silent: false, failOnStdErr: false });
    if (result.stderr.search("error: Error: (?=.*TF1590010)") >= 0) {
        tl.warning("Task already installed in target account - Ignoring error TF1590010 returned by tfx.");
        tl.setResult(tl.TaskResult.Succeeded, "Ignored");
    }

    if (result.stderr.search("error: Error: (?!.*TF1590010)") >= 0) {
        tl.setResult(tl.TaskResult.Failed, "Failed");
    }
});
