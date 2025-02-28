import * as tl from "azure-pipelines-task-lib/task";
import * as tlr from "azure-pipelines-task-lib/toolrunner";
import * as common from "../../Common/v4/Common";
import promiseRetry from "promise-retry";

async function run() {
    await common.runTfx(async tfx => {
        try
        {
            tfx.arg(["extension", "isvalid", "--json", "--no-color"]);

            common.setTfxMarketplaceArguments(tfx);
            common.validateAndSetTfxManifestArguments(tfx);

            const options = {
                retries: +tl.getInput("maxRetries", false) || 10,
                factor: 1,
                minTimeout: 1000 * 60 * (+tl.getInput("minTimeout", false) || 1),
                maxTimeout: 1000 * 60 * (+tl.getInput("maxTimeout", false) || 15),
                randomize: false
            };

            await promiseRetry(options,
                (retry, attempt) => {
                    tl.debug(`Attempt: ${attempt}`);
                    const result = tfx.execSync({ silent: false, failOnStdErr: false } as tlr.IExecSyncOptions);
                    const json = JSON.parse(result.stdout);
                    switch (json.status) {
                        case "pending":
                            return retry(json.status);
                        case "success":
                            return json.status;
                        default:
                            throw json.status;
                    }
            });
            tl.setResult(tl.TaskResult.Succeeded, "Extension is valid.");
        } catch (err) {
            tl.setResult(tl.TaskResult.Failed, `Extension validation failed: ${err.toString()}`);
        }
    });
}

void run();