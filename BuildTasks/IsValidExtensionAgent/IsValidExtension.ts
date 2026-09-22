import tl from "azure-pipelines-task-lib";
import tr from "azure-pipelines-task-lib/toolrunner.js";
import * as common from "../Common/Common.js";
import * as commonAuth from "../Common-Auth/CommonAuth.js";
import promiseRetry from "promise-retry";

await common.runTfx(async tfx => {
    try {
        tfx.arg(["extension", "isvalid", "--json", "--no-color"]);

    await commonAuth.setTfxMarketplaceArguments(tfx);
        // Skip the generic "version override via --overrides-file" path: --overrides-file
        // is not honored by "tfx extension isvalid" anyway (#1741), and we pass --version
        // explicitly below, so there's no need to ever create that temp file here.
        common.validateAndSetTfxManifestArguments(tfx, { skipVersionOverride: true });

        // "tfx extension isvalid" does not support --overrides-file for selecting the
        // version to check; it only honors an explicit --version argument. Pass it
        // directly here rather than relying on the overrides file written by
        // validateAndSetTfxManifestArguments, otherwise the requested version is
        // silently ignored and the latest version is checked instead (#1741).
        const extensionVersion = common.getExtensionVersion();
        tfx.argIf(extensionVersion, ["--version", extensionVersion]);

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

                const exitCode = await tfx.execAsync({ outStream: outputStream, errorStream: errorStream, failOnStdErr: false, ignoreReturnCode: true } as tr.IExecOptions);

                // A non-zero exit code or empty stdout means tfx itself failed (e.g. a
                // transient network/timeout error reaching the Marketplace) before it
                // could report a validation status. That is a transient/retryable
                // condition, not a "the extension is invalid" verdict, so it must not
                // be parsed as JSON nor be reported as a validation failure (#1742).
                if (exitCode !== 0 || !outputStream.jsonString) {
                    const reason = errorStream.messages.join("").trim() || `tfx exited with code ${exitCode} and produced no output`;
                    return retry(new Error(`Could not reach the Marketplace to determine validation status: ${reason}`));
                }

                let json: { status?: string; message?: string };
                try {
                    json = JSON.parse(outputStream.jsonString) as { status?: string; message?: string };
                } catch (parseError) {
                    const parseMessage = parseError instanceof Error ? parseError.message : String(parseError);
                    return retry(new Error(`Could not reach the Marketplace to determine validation status: unable to parse tfx output (${parseMessage})`));
                }

                switch (json.status) {
                    case "pending":
                        return retry(new Error(json.status));
                    case "success":
                        return json.status;
                    default:
                        throw new Error(json.message || json.status);
                }
            });
        tl.setResult(tl.TaskResult.Succeeded, "Extension is valid.");
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, `Extension validation failed: ${err}`);
    }
});
