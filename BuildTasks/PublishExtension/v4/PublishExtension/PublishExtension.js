"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("core-js");
const tl = require("azure-pipelines-task-lib/task");
const common = require("../Common/Common");
const vsixeditor = require("./vsixeditor");
void common.runTfx((tfx) => __awaiter(void 0, void 0, void 0, function* () {
    let cleanupTfxArgs;
    try {
        tfx.arg(["extension", "publish", "--json", "--no-color"]);
        const outputVariable = tl.getInput("outputVariable", false);
        common.setTfxMarketplaceArguments(tfx);
        const fileType = tl.getInput("fileType", true);
        let vsixOutput;
        if (fileType === "manifest") {
            cleanupTfxArgs = common.validateAndSetTfxManifestArguments(tfx);
            yield common.checkUpdateTasksManifests();
        }
        else {
            const vsixFilePattern = tl.getPathInput("vsixFile", true);
            let matchingVsixFile;
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
            const extensionVisibility = tl.getInput("extensionVisibility", false) || "";
            const extensionPricing = tl.getInput("extensionPricing", false);
            const extensionVersion = common.getExtensionVersion();
            const updateTasksId = tl.getBoolInput("updateTasksId", false);
            const updateTasksVersion = tl.getBoolInput("updateTasksVersion", false);
            if (publisher
                || extensionId
                || extensionTag
                || extensionName
                || (extensionPricing && extensionPricing !== "default")
                || (extensionVisibility && extensionVisibility !== "default")
                || extensionVersion
                || updateTasksId) {
                tl.debug("Start editing of VSIX");
                const ve = new vsixeditor.VSIXEditor(vsixFile, vsixOutput);
                ve.startEdit();
                if (publisher) {
                    ve.editPublisher(publisher);
                }
                if (extensionId) {
                    ve.editId(extensionId);
                }
                if (extensionTag) {
                    ve.editIdTag(extensionTag);
                }
                if (extensionName) {
                    ve.editExtensionName(extensionName);
                }
                if (extensionVisibility) {
                    ve.editExtensionVisibility(extensionVisibility);
                }
                if (extensionPricing) {
                    ve.editExtensionPricing(extensionPricing);
                }
                if (extensionVersion) {
                    ve.editVersion(extensionVersion);
                    ve.editUpdateTasksVersion(updateTasksVersion);
                }
                if (updateTasksId) {
                    ve.editUpdateTasksId(updateTasksId);
                }
                const vsixGeneratedFile = yield ve.endEdit();
                tfx.arg(["--vsix", vsixGeneratedFile]);
                vsixOutput = vsixGeneratedFile;
            }
            else {
                vsixOutput = vsixFile;
                tfx.arg(["--vsix", vsixOutput]);
            }
        }
        const shareWith = tl.getDelimitedInput("shareWith", ",", false).map((value) => { return value.trim(); });
        const extensionVisibility = tl.getInput("extensionVisibility", false) || "";
        const connectTo = tl.getInput("connectTo", true);
        if (shareWith) {
            if (connectTo === "TFS") {
                tl.warning("Ignoring Share - Not available on TFS.");
            }
            else if (extensionVisibility.indexOf("public") < 0) {
                tfx.argIf(shareWith && shareWith.length > 0, ["--share-with"].concat(shareWith));
            }
            else if (shareWith && shareWith.length > 0) {
                tl.warning("Ignoring Share - Not available on public extensions.");
            }
        }
        const noWaitValidation = tl.getBoolInput("noWaitValidation", false);
        if (noWaitValidation) {
            tl.debug(`Not waiting for validation.`);
            tfx.arg("--no-wait-validation");
        }
        const bypassLocalValidation = tl.getBoolInput("bypassLocalValidation", false);
        if (bypassLocalValidation) {
            tl.debug(`Bypassing local validation.`);
            tfx.arg("--bypass-validation");
        }
        const args = tl.getInput("arguments", false);
        if (args) {
            tl.debug(`Adding additional arguments: ${args}.`);
            tfx.line(args);
        }
        tl.debug(`Redirecting output to stderr.`);
        tfx.arg(['--debug-log-stream', 'stderr']);
        tl.debug(`Run tfx.`);
        const outputStream = new common.TfxJsonOutputStream(console.log);
        const errorStream = new common.TfxJsonOutputStream(tl.error);
        const code = yield tfx.exec({ outStream: outputStream, errorStream: errorStream, failOnStdErr: false });
        if (code !== 0) {
            throw `tfx exited with return code: ${code}`;
        }
        const json = JSON.parse(outputStream.jsonString);
        if (json && json.published) {
            const publishedVsix = fileType === "manifest" ? json.packaged : vsixOutput;
            if (outputVariable) {
                tl.setVariable(outputVariable, publishedVsix);
            }
            tl.setVariable("Extension.OutputPath", publishedVsix);
            console.log(`Published VSIX: ${publishedVsix}.`);
            tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
        }
        else {
            tl.setResult(tl.TaskResult.Failed, `Publishing failed`);
        }
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }
    finally {
        if (cleanupTfxArgs) {
            cleanupTfxArgs();
        }
    }
    return Promise.resolve(true);
}));
//# sourceMappingURL=PublishExtension.js.map