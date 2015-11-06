var path = require('path');
var tl = require('vso-task-lib');

var tfx = new tl.ToolRunner(tl.which('tfx', true));
tfx.arg("package");

var rootFolder = tl.getInput('rootFolder', false);
if (rootFolder) {
    tfx.args('-r');
    tfx.arg(rootFolder);
}

var globsManifest = tl.getInput('patternManifest', false);
if (globsManifest) {
    tfx.args('-m');
    tfx.arg(globsManifest);
}

var outputPath = tl.getInput('outputPath', false);
if (outputPath) {
    tfx.args('-o');
    tfx.args(outputPath);
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
