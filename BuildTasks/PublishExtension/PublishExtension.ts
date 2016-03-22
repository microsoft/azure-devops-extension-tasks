///<reference path="../typings/main.d.ts" />
import tl = require("vsts-task-lib/task");
import common = require("./common");
import vsixeditor = require("./vsixeditor");
import path = require("path");

common.runTfx(tfx => {
    tfx.arg(["extension", "publish", "--json"]);
    const outputVariable = tl.getInput("outputVariable", false);

    // Read gallery endpoint
    const galleryEndpoint = common.getMarketplaceEndpointDetails();
    tfx.arg(["--token", galleryEndpoint.token]);
    tfx.arg(["--service-url", galleryEndpoint.url]);

    // Read file type
    const fileType = tl.getInput("fileType", true);
    let vsixOutput;
    let cleanupTfxArgs: () => void;
    if (fileType === "manifest") {
        // Set tfx manifest arguments
        cleanupTfxArgs = common.setTfxManifestArguments(tfx);
    } else {
        // Set vsix file argument
        let vsixFile = tl.getInput("vsixFile", true);
        vsixOutput = path.join(tl.getVariable("System.DefaultWorkingDirectory"), "output.vsix");

        const publisher = tl.getInput("publisherId", false);
        const extensionId = tl.getInput("extensionId", false);
        const extensionName = tl.getInput("extensionName", false);
        const extensionVisibility = tl.getInput("extensionVisibility", false);
        const extensionVersion = tl.getInput("extensionVersion", false);

        if (publisher
            || extensionId
            || extensionName
            || (extensionVisibility && extensionVisibility !== "default")
            || extensionVersion) {

            tl.debug("Start editing of VSIX");
            let ve = new vsixeditor.VSIXEditor(vsixFile, vsixOutput);
            ve.startEdit();

            if (publisher) { ve.editPublisher(publisher); }
            if (extensionId) { ve.editId(extensionId); }
            if (extensionName) { ve.editExtensionName(extensionName); }
            if (extensionVisibility) { ve.editExtensionVisibility(extensionVisibility); }
            if (extensionVersion) { ve.editVersion(extensionVersion); }

            ve.endEdit();
        }
        else {
            vsixOutput = vsixFile;
        }

        tfx.arg(["--vsix", vsixOutput]);
    }

    // Share with
    const shareWith = tl.getInput("shareWith");
    if (shareWith) {
        // Sanitize accounts to share with
        let accounts = shareWith.split(",").map(a => a.replace(/\s/g, "")).filter(a => a.length > 0);
        tfx.argIf(accounts && accounts.length > 0, ["--share-with", ...accounts]);
    }

    // Aditional arguments
    tfx.arg(tl.getInput("arguments", false));

    // Set working folder
    const cwd = tl.getInput("cwd", false);
    if (cwd) {
        tl.cd(cwd);
    }

    const outputStream = new common.TfxJsonOutputStream();

    tfx.exec(<any>{ outStream: outputStream, failOnStdErr: true }).then(code => {
        const json = JSON.parse(outputStream.jsonString);

        const publishedVsix = fileType === "manifest" ? json.packaged : vsixOutput;

        if (fileType === "manifest" && outputVariable) {
            tl.setVariable(outputVariable, publishedVsix);
        }

        tl._writeLine(`Published VSIX: ${publishedVsix}.`);
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }).finally(() => {
        if (cleanupTfxArgs) {
            cleanupTfxArgs();
        }
    });
});
