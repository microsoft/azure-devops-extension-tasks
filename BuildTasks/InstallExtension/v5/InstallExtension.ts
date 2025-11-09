import tl from "azure-pipelines-task-lib";
import * as common from "../../Common/v5/Common.js";
import * as commonAuth from "../../Common-Auth/v5/CommonAuth.js";

const accounts = tl.getDelimitedInput("accounts", ",", true).map((value) => { return value.trim(); });

accounts.forEach(async (account) => await common.runTfx(async tfx => {
    try {
        tfx.arg(["extension", "install", "--no-color"]);

    await commonAuth.setTfxMarketplaceArguments(tfx, false);
        common.validateAndSetTfxManifestArguments(tfx);

        // Installation targets
        tfx.arg(["--service-url", account]);

        const result = tfx.execSync(<any>{ silent: false, failOnStdErr: false });
        if (result.stderr.search("error: Error: (?=.*TF1590010)") >= 0) {
            tl.warning("Task already installed in target account - Ignoring error TF1590010 returned by tfx.");
            tl.setResult(tl.TaskResult.Succeeded, "Ignored");
        }

        if (result.stderr.search("error: Error: (?!.*TF1590010)") >= 0) {
            tl.setResult(tl.TaskResult.Failed, "Failed");
        }
        tl.setResult(tl.TaskResult.Succeeded, "Installed");
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, `Failed: ${err}`);
    }
}));
