import tl from "azure-pipelines-task-lib";
import tr from "azure-pipelines-task-lib/toolrunner.js";
import * as common from "../Common/Common.js";
import * as commonAuth from "../Common-Auth/CommonAuth.js";
import promiseRetry from "promise-retry";

await common.runTfx(async tfx => {
    try {
        tfx.arg(["extension", "isvalid", "--json", "--no-color"]);

    await commonAuth.setTfxMarketplaceArguments(tfx);
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
                
                await tfx.execAsync({ outStream: outputStream, errorStream: errorStream, failOnStdErr: false, ignoreReturnCode: true } as tr.IExecOptions);
                
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
        tl.setResult(tl.TaskResult.Failed, `Extension validation failed: ${err}`);
    }
});
