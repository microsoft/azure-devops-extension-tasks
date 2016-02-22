///<reference path="../typings/main.d.ts" />
import tl = require('vsts-task-lib/task');
import common = require("../Common/common");

common.runTfx(tfx => {
    tfx.arg("extension");
    tfx.arg("create");

    var publisher = tl.getInput('publisher', false);
    if (publisher) {
        tfx.arg('--publisher');
        tfx.arg(publisher);
    }

    var rootFolder = tl.getInput('rootFolder', false);
    if (rootFolder) {
        tfx.arg('--root');
        tfx.arg(rootFolder);
    }

    var globsManifest = tl.getInput('patternManifest', false);
    if (globsManifest) {
        tfx.arg('--manifest-globs');
        tfx.arg(globsManifest);
    }

    var outputPath = tl.getInput('outputPath', false);
    if (outputPath) {
        tfx.arg('--output-path');
        tfx.arg(outputPath);
    }

    tfx.arg(tl.getInput('arguments', false));

    var cwd = tl.getInput('cwd', false);
    if (cwd) {
        tl.cd(cwd);
    }

    tfx.exec().then(code => {
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    });    
})

