import tl from "azure-pipelines-task-lib/task.js";
import * as common from "../../Common/v5/Common.js";

try {
    await common.runTfx(async tfx => {
        let cleanupTfxArgs: () => void = null;
        try {
            tfx.arg(["extension", "create", "--json", "--no-color"]);
            const outputVariable = tl.getInput("outputVariable", false);

            // Set tfx manifest arguments
            cleanupTfxArgs = common.validateAndSetTfxManifestArguments(tfx);

            // Set vsix output path
            const outputPath = tl.getInput("outputPath", false);
            tfx.argIf(outputPath, ["--output-path", outputPath]);

            // Before executing check update on tasks version
            await common.checkUpdateTasksManifests();
            const outputStream = new common.TfxJsonOutputStream(console.log);

            const code = await tfx.execAsync(<any>{ outStream: outputStream, failOnStdErr: false });
            if (code !== 0) {
                throw `tfx exited with return code: ${code}`
            }
            const json = JSON.parse(outputStream.jsonString);

            if (outputVariable) {
                tl.setVariable(outputVariable, json.path);
            }
            tl.setVariable("Extension.OutputPath", json.path);

            console.log(`Packaged extension: ${json.path}.`);
            tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, `${err}`);
        }
        finally {
            if (cleanupTfxArgs) {
                cleanupTfxArgs();
            }
        }
    });
}
catch (err) {
    console.log(`Error packaging extension: ${err}.`);
    tl.setResult(tl.TaskResult.Failed, `Error packaging extension: ${err}`);
}
