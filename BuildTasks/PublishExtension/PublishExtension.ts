///<reference path="../typings/main.d.ts" />
import Q = require("q");
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
    let runBeforeTfx = Q(null);

    if (fileType === "manifest") {
        // Set tfx manifest arguments
        cleanupTfxArgs = common.setTfxManifestArguments(tfx);

        // Update tasks version if needed
        runBeforeTfx = runBeforeTfx.then(() => common.checkUpdateTasksVersion());
    } else {
        // Set vsix file argument
        let vsixFile = tl.getInput("vsixFile", true);
        vsixOutput = tl.getVariable("System.DefaultWorkingDirectory");

        const publisher = tl.getInput("publisherId", false);

        let extensionId = tl.getInput("extensionId", false);
        const extensionTag = tl.getInput("extensionTag", false);

        if (extensionId && extensionTag) {
            extensionId += extensionTag;
            tl.debug(`Overriding extension id to: ${extensionId}`);
        }

        const extensionName = tl.getInput("extensionName", false);
        const extensionVisibility = tl.getInput("extensionVisibility", false);
                
        let extensionVersion = tl.getInput("extensionVersion", false);
        if (extensionVersion) {
            const extractedVersions = extensionVersion.match(/[0-9]+\.[0-9]+\.[0-9]+/);
            if (extractedVersions && extractedVersions.length === 1) {
                extensionVersion = extractedVersions[0];
                tl.debug(`Overriding extension version to: ${extensionVersion}`);
            }
            else
            {
                tl.error(`Supplied Extension Version must contain a string matching '##.##.##'.`);
            }
        }
        
        const updateTasksVersion = tl.getBoolInput("updateTasksVersion", false);

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
            if (extensionVersion) {
                ve.editVersion(extensionVersion);
                ve.editUpdateTasksVersion(updateTasksVersion);
            }

            runBeforeTfx = runBeforeTfx.then(() => ve.endEdit().then(vsixGeneratedFile => {
                tfx.arg(["--vsix", vsixGeneratedFile]);
                vsixOutput = vsixGeneratedFile;
                return true;
            }));
        }
        else {
            vsixOutput = vsixFile;
            tfx.arg(["--vsix", vsixOutput]);
        }
    }

    // Share with
    const shareWith = tl.getInput("shareWith");
    const extensionVisibility = tl.getInput("extensionVisibility", false);

    if (shareWith) {
        // Only handle shareWith if the extension is not public
        if (extensionVisibility.indexOf("public") < 0) {
            // Sanitize accounts to share with
            let accounts = shareWith.split(",").map(a => a.replace(/\s/g, "")).filter(a => a.length > 0);
            tfx.argIf(accounts && accounts.length > 0, ["--share-with", ...accounts]);
        } else {
            tl.warning("Ignoring Share - Not available on public extensions.");
        }
    }

    // Aditional arguments
    tfx.arg(tl.getInput("arguments", false));

    // Set working folder
    const cwd = tl.getInput("cwd", false);
    if (cwd) { tl.cd(cwd); }

    runBeforeTfx.then(() => {
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
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `Error occurred before preparing to run tfx: ${err}`);
    });
});