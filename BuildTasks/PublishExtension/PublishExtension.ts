///<reference path="../typings/main.d.ts" />
import tl = require('vsts-task-lib/task');
import common = require('../Common/Common');

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

    var apitoken = auth.parameters['password'];

    return {
        "url": hostUrl,
        "token": apitoken
    };
}

common.runTfx(tfx => {
    tfx.arg("extension publish");

    // Read gallery endpoint
    var galleryEndpoint = getEndpointDetails('connectedServiceName');
    tfx.arg('--token');
    tfx.arg(galleryEndpoint.token);

    tfx.arg('--service-url');
    tfx.arg(galleryEndpoint.url);

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
});
