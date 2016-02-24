///<reference path="../typings/main.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");

common.runTfx(tfx => {
    tfx.arg(["extension", "create"]);

    // Set tfx manifest arguments
    const cleanupTfxArgs = common.setTfxManifestArguments(tfx);

    // Set vsix output path
    const outputPath = tl.getInput("outputPath", false);
    tfx.argIf(outputPath, ["--output-path", outputPath]);

    // Aditional arguments
    tfx.arg(tl.getInput("arguments", false));

    // Set working directory
    const cwd = tl.getInput("cwd", false);
    if (cwd) {
        tl.cd(cwd);
    }

    tfx.exec().then(code => {
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }).finally(() => {
        cleanupTfxArgs();
    });
});

