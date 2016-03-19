///<reference path="../typings/main.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");
import stream = require("stream");

class TfxDebugStream extends stream.Writable {

    jsonString: string;
    messages: string[];
    commandline: string;

    _write(chunk: any, enc: string, cb: Function) {
        if (!this.commandline) {
            this.commandline = chunk;
        }
        else if (!this.jsonString && !chunk.startsWith("{")) {
            this.messages += chunk;
        }
        else {
            this.jsonString += chunk;
        }
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
    
    const outputStream = new TfxDebugStream();

    tfx.exec(<any>{ outStream: outputStream }).then(code => {
        tl._writeLine(outputStream.commandline);

        for (let i = 0; i <= outputStream.messages.length; i++) {
            tl.warning(outputStream.messages[i]);
        }

        const json = JSON.parse(outputStream.jsonString);

        if (outputVariable) {
            tl.setVariable(outputVariable, json.path);
        }

        tl._writeLine("Packaged extension: ${json.path}.");
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }).fail(err => {
        tl._writeLine(outputStream.commandline);

        for (let i = 0; i <= outputStream.messages.length; i++) {
            tl.error(outputStream.messages[i]);
        }

        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }).finally(() => {
        cleanupTfxArgs();
    });
});

