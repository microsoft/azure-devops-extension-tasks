import * as tl from "azure-pipelines-task-lib/task";
import * as common from "../../Common/v4/Common";

const accounts = tl.getDelimitedInput("accounts", ",", true).map((value) => { return value.trim(); });

void accounts.forEach(async (account) => await common.runTfx(tfx => {
    try {
        tfx.arg(["extension", "install", "--no-color"]);

        common.setTfxMarketplaceArguments(tfx, false);
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