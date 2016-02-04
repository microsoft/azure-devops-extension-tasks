var path = require('path');
var tl = require('vsts-task-lib/task');

var tfx = new tl.ToolRunner(tl.which('tfx', true));
tfx.arg("extension");
tfx.arg("create");

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

tfx.arg(tl.getDelimitedInput('arguments', ' ', false));

var cwd = tl.getInput('cwd', false);
if (cwd) {
    tl.cd(cwd);
}

tfx.exec({ failOnStdErr: false})
.then(function(code) {
    tl.exit(code);
})
.fail(function(err) {
    tl.debug('taskRunner fail');
    tl.exit(1);
})
