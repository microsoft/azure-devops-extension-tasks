import * as tl from "vsts-task-lib/task";
import * as common from "./common";
import * as stream from "stream";
import promiseRetry = require("promise-retry");

// common.setProxy();

function run() {
    common.runTfx(tfx => {
        tfx.arg(["version"]);
        tfx.execSync();
    });

    common.runTfx(tfx => {
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

        promiseRetry(options,
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
        }).then(status => {
            tl.setResult(tl.TaskResult.Succeeded, "Extension is valid.");
            return status;
        }).catch(err => {
            tl.setResult(tl.TaskResult.Failed, `Extension validation failed: ${err}`);
        });
    });
}

run();