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

    var hostUsername = auth.parameters.username;
    var hostPassword = auth.parameters.password;

    return {
        "Url": hostUrl,
        "Username": hostUsername,
        "Password": hostPassword
    };
}

var tfx = new tl.ToolRunner(tl.which('tfx', true));
tfx.arg("extension publish");

// Read gallery endpoint
var galleryEndpoint = getEndpointDetails('connectedServiceName');
tfx.arg('--token');
tfx.arg(galleryEndpoint.Password);

tfx.arg('--service-url');
tfx.arg(galleryEndpoint.Url);

// Read file type
var fileType = tl.getInput('fileType', true);
if (fileType == "manifest") {
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
} else {
    var vsixFile = tl.getInput('vsixFile', true);
    tfx.arg('--vsix');
    tfx.arg(vsixFile);
}

// Read publisher
var publisher = tl.getInput('publisher', false);
if (publisher) {
    tfx.arg('--publisher');
    tfx.arg(publisher);
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
