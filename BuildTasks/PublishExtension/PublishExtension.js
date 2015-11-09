var path = require('path');
var tl = require('vso-task-lib');

function getEndpointDetails(inputFieldName) {
    var errorMessage = "Could not decode the generic endpoint. Please ensure you are running the latest agent (min version 0.3.0)"
    if (!tl.getEndpointUrl) {
        throw new Error(errorMessage);
    }

    var genericEndpoint = tl.getInput(inputFieldName);
    if (!genericEndpoint) {
        throw new Error(errorMessage);
    }

    var hostUrl = tl.getEndpointUrl(genericEndpoint, false);
    var auth = tl.getEndpointAuthorization(genericEndpoint, false);

    if (auth.scheme != "UsernamePassword") {
        throw new Error("The authorization scheme " + auth.scheme + " is not supported for a Gallery endpoint. Please use a username and a password.");
    }

    var hostUsername = auth.parameters.Username;
    var hostPassword = auth.parameters.Password;

    return {
        "Url": hostUrl,
        "Username": hostUsername,
        "Password": hostPassword
    };
}

var vset = new tl.ToolRunner(tl.which('vset', true));
vset.arg("publish");

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
