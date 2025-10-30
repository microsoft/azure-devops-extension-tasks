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
                async (retry, attempt) => {
                    tl.debug(`Attempt: ${attempt}`);
                    
                    const outputStream = new common.TfxJsonOutputStream(console.log);
                    const errorStream = new common.TfxJsonOutputStream(tl.error);
                    
                    await tfx.execAsync({ outStream: outputStream, errorStream: errorStream, failOnStdErr: false, ignoreReturnCode: true } as tlr.IExecOptions);
                    
                    const json = JSON.parse(outputStream.jsonString);
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