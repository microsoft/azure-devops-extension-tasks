var path = require('path');
var tl = require('vsts-task-lib/task');

function getEndpointDetails(inputFieldName) {
    var errorMessage = "Could not decode the marketplace endpoint. Please ensure you are running the latest VSTS agent";
    if (!tl.getEndpointUrl) {
        throw new Error(errorMessage);
    }

    var marketplaceEndpoint = tl.getInput(inputFieldName);
    if (!marketplaceEndpoint) {
        throw new Error(errorMessage);
    }

    var hostUrl = tl.getEndpointUrl(marketplaceEndpoint, false);
    var auth = tl.getEndpointAuthorization(marketplaceEndpoint, false);

    var apitoken = auth.parameters.password;

    return {
        "Url": hostUrl,
        "Token": apitoken
    };
}

var tfx = new tl.ToolRunner(tl.which('tfx', true));
tfx.arg("extension publish");

// Read gallery endpoint
var galleryEndpoint = getEndpointDetails('connectedServiceName');
tfx.arg('--token');
tfx.arg(galleryEndpoint.Token);

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
