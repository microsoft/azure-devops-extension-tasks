///<reference path="../typings/main.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");
import stream = require("stream");

class TfxDebugStream extends stream.Writable {
    _write(chunk: any, enc: string, cb: Function) {
        tl.debug(chunk);
        cb();
    }
}

common.runTfx(tfx => {
    tfx.arg(["extension", "create", "--json"]);
    const outputVariable = tl.getInput("outputVariable", false);

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
    
    let output = "";
    tfx.on("stdout", (data) => output += data);

    tfx.exec(<any>{ outStream: new TfxDebugStream() }).then(code => {
        const json = JSON.parse(output);

        if (outputVariable) {
            tl.setVariable(outputVariable, json.path);
        }
        tl._writeLine("Packaged extension: ${json.path}.");
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }).finally(() => {
        cleanupTfxArgs();
    });
});

