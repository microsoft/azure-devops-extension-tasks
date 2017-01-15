///<reference path="../typings/index.d.ts" />
import * as Q from "q";
import * as tl from "vsts-task-lib/task";
import * as common from "./common";
import * as vsixeditor from "./vsixeditor";
import * as path from "path";
import * as os from "os";

common.runTfx(tfx => {
    tfx.arg(["extension", "publish", "--json"]);
    const outputVariable = tl.getInput("outputVariable", false);

    common.setTfxMarketplaceArguments(tfx);

    // Read file type
    const fileType = tl.getInput("fileType", true);
    let vsixOutput;
    let cleanupTfxArgs: () => void;
    let runBeforeTfx = Q(null);

    if (fileType === "manifest") {
        // Set tfx manifest arguments
        cleanupTfxArgs = common.validateAndSetTfxManifestArguments(tfx);

        // Update tasks version if needed
        runBeforeTfx = runBeforeTfx.then(() => common.checkUpdateTasksManifests());
    } else {
        // Set vsix file argument
        let vsixFilePattern = tl.getPathInput("vsixFile", true);
        let matchingVsixFile: string[];
        if (vsixFilePattern.indexOf("*") >= 0 || vsixFilePattern.indexOf("?") >= 0) {
            tl.debug("Pattern found in vsixFile parameter");
            matchingVsixFile = tl.findMatch(tl.getInput("cwd", false) || process.cwd(), vsixFilePattern);
        }
        else {
            tl.debug("No pattern found in vsixFile parameter");
            matchingVsixFile = [vsixFilePattern];
        }

        if (!matchingVsixFile || matchingVsixFile.length === 0) {
            tl.setResult(tl.TaskResult.Failed, `Found no vsix files matching: ${vsixFilePattern}.`);
            return false;
        }
        if (matchingVsixFile.length !== 1) {
            tl.setResult(tl.TaskResult.Failed, `Found multiple vsix files matching: ${vsixFilePattern}.`);
            return false;
        }

        const vsixFile = matchingVsixFile[0];
        tl.checkPath(vsixFile, "vsixPath");

        vsixOutput = tl.getVariable("System.DefaultWorkingDirectory");

        const publisher = tl.getInput("publisherId", false);

        const extensionId = tl.getInput("extensionId", false);
        const extensionTag = tl.getInput("extensionTag", false);

        const extensionName = tl.getInput("extensionName", false);
        const extensionVisibility = tl.getInput("extensionVisibility", false);
        const extensionPricing = tl.getInput("extensionPricing", false);
        const extensionVersion = common.getExtensionVersion();

        const updateTasksVersion = tl.getBoolInput("updateTasksVersion", false);

        if (publisher
            || extensionId
            || extensionTag
            || extensionName
            || (extensionPricing && extensionPricing !== "default")
            || (extensionVisibility && extensionVisibility !== "default")
            || extensionVersion) {

            tl.debug("Start editing of VSIX");
            let ve = new vsixeditor.VSIXEditor(vsixFile, vsixOutput);
            ve.startEdit();

            if (publisher) { ve.editPublisher(publisher); }
            if (extensionId) { ve.editId(extensionId); }
            if (extensionTag) { ve.editIdTag(extensionTag); }
            if (extensionName) { ve.editExtensionName(extensionName); }
            if (extensionVisibility) { ve.editExtensionVisibility(extensionVisibility); }
            if (extensionPricing) { ve.editExtensionPricing(extensionPricing); }
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
    const shareWith = tl.getDelimitedInput("shareWith", ",", false);
    const extensionVisibility = tl.getInput("extensionVisibility", false);
    const connectTo = tl.getInput("connectTo", true);
    if (shareWith) {
        if (connectTo === "TFS") {
            tl.warning("Ignoring Share - Not available on TFS.");
        }
        else if (extensionVisibility.indexOf("public") < 0) {
            // Only handle shareWith if the extension is not public
            tfx.argIf(shareWith && shareWith.length > 0, ["--share-with"].concat(shareWith));
        } else {
            tl.warning("Ignoring Share - Not available on public extensions.");
        }
    }

    runBeforeTfx.then(() => {
        const outputStream = new common.TfxJsonOutputStream(true);
        tfx.exec(<any>{ outStream: outputStream, failOnStdErr: true }).then(code => {
            const json = JSON.parse(outputStream.jsonString);

            const publishedVsix = fileType === "manifest" ? json.packaged : vsixOutput;

            if (outputVariable) {
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