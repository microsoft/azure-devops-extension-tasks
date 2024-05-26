import tl from "azure-pipelines-task-lib";
import * as common from "../../Common/v5/Common.js";
import promiseRetry from "promise-retry";

await common.runTfx(async tfx => {
    try {
        tfx.arg(["extension", "isvalid", "--json", "--no-color"]);

        await common.setTfxMarketplaceArguments(tfx);
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
                const result = tfx.execSync({ silent: false, failOnStdErr: false } as any);
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
        tl.setResult(tl.TaskResult.Failed, `Extension validation failed: ${err}`);
    }
});
