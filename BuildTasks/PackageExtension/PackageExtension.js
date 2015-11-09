var path = require('path');
var tl = require('vso-task-lib');

var vset = new tl.ToolRunner(tl.which('vset', true));
vset.arg("package");

var rootFolder = tl.getInput('rootFolder', false);
if (rootFolder) {
    vset.args('-r');
    vset.arg(rootFolder);
}

var globsManifest = tl.getInput('patternManifest', false);
if (globsManifest) {
    vset.args('-m');
    vset.arg(globsManifest);
}

var outputPath = tl.getInput('outputPath', false);
if (outputPath) {
    vset.args('-o');
    vset.args(outputPath);
}

vset.arg(tl.getDelimitedInput('arguments', ' ', false));

var cwd = tl.getInput('cwd', false);
if (cwd) {
    tl.cd(cwd);
}

vset.exec({ failOnStdErr: false})
.then(function(code) {
    tl.exit(code);
})
.fail(function(err) {
    tl.debug('taskRunner fail');
    tl.exit(1);
})
