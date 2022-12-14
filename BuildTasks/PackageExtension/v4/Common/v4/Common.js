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
exports.checkUpdateTasksManifests = exports.writeManifest = exports.updateManifests = exports.TfxJsonOutputStream = exports.setTfxMarketplaceArguments = exports.getMarketplaceEndpointDetails = exports.getExtensionVersion = exports.runTfx = exports.validateAndSetTfxManifestArguments = void 0;
const path = require("path");
const stream = require("stream");
const fs = require("fs");
const tl = require("azure-pipelines-task-lib/task");
const trl = require("azure-pipelines-task-lib/toolrunner");
const fse = require("fs-extra");
const uuidv5 = require("uuidv5");
const tmp = require("tmp");
function writeBuildTempFile(taskName, data) {
    const tempDir = tl.getVariable("Agent.TempDirectory");
    const tempFile = tmp.tmpNameSync({ prefix: taskName, postfix: ".tmp", tmpdir: tempDir });
    tl.debug(`Generating Build temp file: ${tempFile}`);
    tl.writeFile(tempFile, data, { mode: 0o600, encoding: "utf8", flag: "wx+" });
    return tempFile;
}
function deleteBuildTempFile(tempFile) {
    if (tempFile && tl.exist(tempFile)) {
        tl.debug(`Deleting temp file: ${tempFile}`);
        fs.unlinkSync(tempFile);
    }
}
function validateAndSetTfxManifestArguments(tfx) {
    const rootFolder = tl.getInput("rootFolder", false);
    tfx.argIf(rootFolder, ["--root", rootFolder]);
    const globsManifest = tl.getDelimitedInput("patternManifest", "\n", false);
    tfx.argIf(globsManifest.length, ["--manifest-globs"]);
    tfx.argIf(globsManifest.length, globsManifest);
    const publisher = tl.getInput("publisherId", false);
    const localizationRoot = tl.getInput("localizationRoot", false);
    tfx.argIf(localizationRoot, ["--loc-root", localizationRoot]);
    let extensionId = tl.getInput("extensionId", false);
    const extensionTag = tl.getInput("extensionTag", false);
    if (extensionId && extensionTag) {
        extensionId += extensionTag;
        tl.debug(`Overriding extension id to: ${extensionId}`);
    }
    switch (tl.getInput("method", false) || tl.getInput("fileType", false)) {
        case "manifest":
        case "id":
        default: {
            tfx.argIf(publisher, ["--publisher", publisher]);
            tfx.argIf(extensionId, ["--extension-id", extensionId]);
            break;
        }
        case "vsix": {
            const vsixFilePattern = tl.getPathInput("vsixFile", true);
            let matchingVsixFile;
            if (vsixFilePattern.indexOf("*") >= 0 || vsixFilePattern.indexOf("?") >= 0) {
                tl.debug("Pattern found in vsixFile parameter.");
                matchingVsixFile = tl.findMatch(process.cwd(), vsixFilePattern);
            }
            else {
                tl.debug("No pattern found in vsixFile parameter.");
                matchingVsixFile = [vsixFilePattern];
            }
            if (!matchingVsixFile || matchingVsixFile.length === 0) {
                tl.setResult(tl.TaskResult.Failed, `Found no vsix files matching: ${vsixFilePattern}.`);
                throw "failed";
            }
            if (matchingVsixFile.length !== 1) {
                tl.setResult(tl.TaskResult.Failed, `Found multiple vsix files matching: ${vsixFilePattern}.`);
                throw "failed";
            }
            tfx.arg(["--vsix", matchingVsixFile[0]]);
            break;
        }
    }
    let jsonOverrides;
    const extensionName = tl.getInput("extensionName", false);
    if (extensionName) {
        tl.debug(`Overriding extension name to: ${extensionName}`);
        jsonOverrides = (jsonOverrides || {});
        jsonOverrides.name = extensionName;
    }
    const extensionVisibility = tl.getInput("extensionVisibility", false);
    if (extensionVisibility && extensionVisibility !== "default") {
        tl.debug(`Overriding extension visibility to: ${extensionVisibility}`);
        jsonOverrides = (jsonOverrides || {});
        const isPublic = extensionVisibility.indexOf("public") >= 0;
        const isPreview = extensionVisibility.indexOf("preview") >= 0;
        jsonOverrides.public = isPublic;
        if (isPreview) {
            jsonOverrides.galleryFlags = jsonOverrides.galleryFlags || [];
            jsonOverrides.galleryFlags.push("Preview");
        }
    }
    const extensionPricing = tl.getInput("extensionPricing", false);
    if (extensionPricing && extensionPricing !== "default") {
        tl.debug(`Overriding extension pricing to: ${extensionPricing}`);
        jsonOverrides = (jsonOverrides || {});
        const isPaid = extensionPricing.indexOf("paid") >= 0;
        if (isPaid) {
            jsonOverrides.galleryFlags = jsonOverrides.galleryFlags || [];
            jsonOverrides.galleryFlags.push("Paid");
        }
    }
    const extensionVersion = getExtensionVersion();
    if (extensionVersion) {
        tl.debug(`Overriding extension version to: ${extensionVersion}`);
        jsonOverrides = (jsonOverrides || {});
        jsonOverrides.version = extensionVersion;
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
    let overrideFilePath;
    if (jsonOverrides) {
        overrideFilePath = writeBuildTempFile("PackageTask", JSON.stringify(jsonOverrides));
        tl.debug(`Generated a JSON temp file to override manifest values Path: ${overrideFilePath}`);
        tfx.arg(["--overrides-file", overrideFilePath]);
    }
    const args = tl.getInput("arguments", false);
    if (args) {
        tl.debug(`Adding additional arguments: ${args}.`);
        tfx.line(args);
    }
    return () => deleteBuildTempFile(overrideFilePath);
}
exports.validateAndSetTfxManifestArguments = validateAndSetTfxManifestArguments;
function runTfx(cmd) {
    return __awaiter(this, void 0, void 0, function* () {
        let tfx;
        let tfxPath;
        const tryRunCmd = (tfx) => __awaiter(this, void 0, void 0, function* () {
            try {
                const cwd = tl.getInput("cwd", false);
                if (cwd) {
                    tl.cd(cwd);
                }
                cmd(tfx);
                return true;
            }
            catch (err) {
                tl.setResult(tl.TaskResult.Failed, `Error running task: ${err}`);
                return false;
            }
        });
        const tfxInstallerPath = tl.getVariable("__tfxpath");
        if (tfxInstallerPath) {
            tfxPath = tl.which(path.join(tfxInstallerPath, "/tfx"));
        }
        if (tfxPath) {
            tl.debug(`using: ${tfxPath}`);
            tfx = new trl.ToolRunner(tfxPath);
            yield tryRunCmd(tfx);
            return;
        }
        tl.setResult(tl.TaskResult.Failed, "Could not find tfx. To resolve, add the 'Use Node CLI for Azure DevOps' task to your pipeline before this task.");
    });
}
exports.runTfx = runTfx;
function getExtensionVersion() {
    const extensionVersion = tl.getInput("extensionVersion", false);
    if (extensionVersion) {
        const extractedVersions = extensionVersion.match(/[0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9]+)?/);
        if (extractedVersions && extractedVersions.length === 1) {
            return extractedVersions[0];
        }
        else {
            throw new Error(`Supplied ExtensionVersion must contain a string matching '##.##.##(.##)'.`);
        }
    }
    return "";
}
exports.getExtensionVersion = getExtensionVersion;
function getMarketplaceEndpointDetails(inputFieldName) {
    const marketplaceEndpoint = tl.getInput(inputFieldName, true);
    const hostUrl = tl.getEndpointUrl(marketplaceEndpoint, false);
    const auth = tl.getEndpointAuthorization(marketplaceEndpoint, false);
    const password = auth.parameters["password"];
    const username = auth.parameters["username"];
    const apitoken = auth.parameters["apitoken"];
    return {
        "url": hostUrl,
        "username": username,
        "password": password,
        "apitoken": apitoken
    };
}
exports.getMarketplaceEndpointDetails = getMarketplaceEndpointDetails;
function setTfxMarketplaceArguments(tfx, setServiceUrl = true) {
    const connectTo = tl.getInput("connectTo", false) || "VsTeam";
    let galleryEndpoint;
    if (connectTo === "VsTeam") {
        galleryEndpoint = getMarketplaceEndpointDetails("connectedServiceName");
        tfx.argIf(setServiceUrl, ["--service-url", galleryEndpoint.url]);
        tfx.arg(["--auth-type", "pat"]);
        tfx.arg(["--token", galleryEndpoint.password]);
    }
    else {
        galleryEndpoint = getMarketplaceEndpointDetails("connectedServiceNameTFS");
        tfx.argIf(setServiceUrl, ["--service-url", galleryEndpoint.url]);
        if (galleryEndpoint.username) {
            tfx.arg(["--auth-type", "basic"]);
            tfx.arg(["--username", galleryEndpoint.username]);
            tfx.arg(["--password", galleryEndpoint.password]);
        }
        else {
            tfx.arg(["--auth-type", "pat"]);
            tfx.arg(["--token", galleryEndpoint.apitoken]);
        }
    }
}
exports.setTfxMarketplaceArguments = setTfxMarketplaceArguments;
class TfxJsonOutputStream extends stream.Writable {
    constructor(out) {
        super();
        this.out = out;
        this.jsonString = "";
        this.messages = [];
    }
    _write(chunk, enc, cb) {
        const chunkStr = chunk.toString();
        if (chunkStr.startsWith("[command]")) {
            this.taskOutput(chunkStr, this.out);
        }
        else if (!this.jsonString && (chunkStr.toString()[0] !== "{" && chunkStr.toString()[0] !== "[")) {
            this.messages.push(chunkStr);
            this.taskOutput(chunkStr, this.out);
        }
        else {
            this.jsonString += chunkStr;
            this.taskOutput(chunkStr, tl.debug);
        }
        cb();
    }
    taskOutput(messages, lineWriter) {
        if (!messages) {
            return;
        }
        messages.split("\n").forEach(lineWriter);
    }
}
exports.TfxJsonOutputStream = TfxJsonOutputStream;
function getTaskPathContributions(manifest) {
    if (!manifest.contributions) {
        return [];
    }
    return manifest.contributions
        .filter((c) => c.type === "ms.vss-distributed-task.task" && c.properties && c.properties["name"])
        .map((c) => c.properties["name"]);
}
function updateTaskId(manifest, publisherId, extensionId) {
    tl.debug(`Task manifest ${manifest.name} id before: ${manifest.id}`);
    const extensionNs = uuidv5("url", "https://marketplace.visualstudio.com/vsts", true);
    manifest.id = uuidv5(extensionNs, `${publisherId}.${extensionId}.${manifest.name}`, false);
    tl.debug(`Task manifest ${manifest.name} id after: ${manifest.id}`);
    return manifest;
}
function updateExtensionManifestTaskIds(manifest, originalTaskId, newTaskId) {
    if (!manifest.contributions) {
        tl.debug(`No contributions found`);
        return manifest;
    }
    manifest.contributions
        .filter((c) => c.type !== "ms.vss-distributed-task.task" && c.properties && c.properties.supportsTasks)
        .forEach((c) => {
        const supportsTasks = [...c.properties.supportsTasks];
        const index = supportsTasks.indexOf(originalTaskId);
        if (index != -1) {
            tl.debug(`Extension manifest supportsTasks before: ${c.properties.supportsTasks}`);
            supportsTasks[index] = newTaskId;
            c.properties.supportsTasks = supportsTasks;
            tl.debug(`Extension manifest supportsTasks after: ${c.properties.supportsTasks}`);
        }
        else {
            tl.debug(`No supportTasks entry found in manifest contribution`);
        }
    });
    return manifest;
}
function updateTaskVersion(manifest, extensionVersionString, extensionVersionType) {
    const versionParts = extensionVersionString.split(".");
    if (versionParts.length > 3) {
        tl.warning("Detected a version that consists of more than 3 parts. Build tasks support only 3 parts, ignoring the rest.");
    }
    const extensionversion = { major: +versionParts[0], minor: +versionParts[1], patch: +versionParts[2] };
    if (!manifest.version && extensionVersionType !== "major") {
        tl.warning("Detected no version in task manifest. Forcing major.");
        manifest.version = extensionversion;
    }
    else {
        tl.debug(`Task manifest ${manifest.name} version before: ${JSON.stringify(manifest.version)}`);
        switch (extensionVersionType) {
            default:
            case "major": manifest.version.Major = `${extensionversion.major}`;
            case "minor": manifest.version.Minor = `${extensionversion.minor}`;
            case "patch": manifest.version.Patch = `${extensionversion.patch}`;
        }
    }
    tl.debug(`Task manifest ${manifest.name} version after: ${JSON.stringify(manifest.version)}`);
    return manifest;
}
function updateManifests(manifestPaths) {
    return __awaiter(this, void 0, void 0, function* () {
        const updateTasksVersion = tl.getBoolInput("updateTasksVersion", false);
        const updateTasksId = tl.getBoolInput("updateTasksId", false);
        if (updateTasksVersion || updateTasksId) {
            if (!(manifestPaths && manifestPaths.length)) {
                manifestPaths = getExtensionManifestPaths();
            }
            tl.debug(`Found manifests: ${manifestPaths.join(", ")}`);
            const tasksIds = yield updateTaskManifests(manifestPaths, updateTasksId, updateTasksVersion);
            yield updateExtensionManifests(manifestPaths, tasksIds);
        }
    });
}
exports.updateManifests = updateManifests;
function updateTaskManifests(manifestPaths, updateTasksId, updateTasksVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        const tasksIds = [];
        yield Promise.all(manifestPaths.map((extensionPath) => __awaiter(this, void 0, void 0, function* () {
            const manifest = yield getManifest(extensionPath);
            const taskManifestPaths = getTaskManifestPaths(extensionPath, manifest);
            if (taskManifestPaths && taskManifestPaths.length) {
                yield Promise.all(taskManifestPaths.map((taskPath) => __awaiter(this, void 0, void 0, function* () {
                    tl.debug(`Patching: ${taskPath}.`);
                    let taskManifest = yield getManifest(taskPath);
                    if (updateTasksId) {
                        tl.debug(`Updating Id...`);
                        const publisherId = tl.getInput("publisherId", false) || manifest.publisher;
                        const extensionTag = tl.getInput("extensionTag", false) || "";
                        const extensionId = `${(tl.getInput("extensionId", false) || manifest.id)}${extensionTag}`;
                        const originalTaskId = taskManifest.id || null;
                        taskManifest = updateTaskId(taskManifest, publisherId, extensionId);
                        const newTaskId = taskManifest.id;
                        if (originalTaskId && (originalTaskId !== newTaskId)) {
                            tasksIds.push([originalTaskId, newTaskId]);
                        }
                    }
                    if (updateTasksVersion) {
                        tl.debug(`Updating version...`);
                        const extensionVersion = tl.getInput("extensionVersion", false) || manifest.version;
                        if (!extensionVersion) {
                            throw new Error("Extension Version was not supplied nor does the extension manifest define one.");
                        }
                        const extensionVersionType = tl.getInput("updateTasksVersionType", false) || "major";
                        taskManifest = updateTaskVersion(taskManifest, extensionVersion, extensionVersionType);
                    }
                    yield writeManifest(taskManifest, taskPath);
                    tl.debug(`Updated: ${taskPath}.`);
                })));
            }
        })));
        return tasksIds;
    });
}
function updateExtensionManifests(manifestPaths, updatedTaskIds) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(manifestPaths.map((path) => __awaiter(this, void 0, void 0, function* () {
            tl.debug(`Patching: ${path}.`);
            let originalManifest = yield getManifest(path);
            updatedTaskIds.map(([originalTaskId, newTaskId]) => {
                tl.debug(`Updating: ${originalTaskId} => ${newTaskId}.`);
                originalManifest = updateExtensionManifestTaskIds(originalManifest, originalTaskId, newTaskId);
            });
            yield writeManifest(originalManifest, path);
        })));
    });
}
function getExtensionManifestPaths() {
    const rootFolder = tl.getInput("rootFolder", false) || tl.getInput("System.DefaultWorkingDirectory");
    const manifestsPatterns = tl.getDelimitedInput("patternManifest", "\n", false) || ["vss-extension.json"];
    tl.debug(`Searching for extension manifests: ${manifestsPatterns.join(", ")}`);
    return tl.findMatch(rootFolder, manifestsPatterns);
}
function getManifest(path) {
    return fse.readFile(path, "utf8").then((data) => {
        try {
            data = data.replace(/^\uFEFF/, () => {
                tl.warning(`Removing Unicode BOM from manifest file: ${path}.`);
                return "";
            });
            return JSON.parse(data);
        }
        catch (jsonError) {
            throw new Error(`Error parsing task manifest: ${path} - ${jsonError}`);
        }
    });
}
function getTaskManifestPaths(manifestPath, manifest) {
    const tasks = getTaskPathContributions(manifest);
    const rootFolder = path.dirname(manifestPath);
    return tasks.reduce((result, task) => {
        tl.debug(`Found task: ${task}`);
        const taskRoot = path.join(rootFolder, task);
        const rootManifest = path.join(taskRoot, "task.json");
        let localizationRoot = tl.filePathSupplied("localizationRoot") ? tl.getPathInput("localizationRoot", false) : taskRoot;
        if (localizationRoot) {
            localizationRoot = path.resolve(localizationRoot);
        }
        if (tl.exist(rootManifest)) {
            tl.debug(`Found single-task manifest: ${rootManifest}`);
            const rootManifests = [rootManifest];
            const rootLocManifest = path.join(localizationRoot, "task.loc.json");
            if (tl.exist(rootLocManifest)) {
                tl.debug(`Found localized single-task manifest: ${rootLocManifest}`);
                rootManifests.push(rootLocManifest);
            }
            return (result).concat(rootManifests);
        }
        else {
            const versionManifests = tl.findMatch(taskRoot, "*/task.json");
            const locVersionManifests = tl.findMatch(localizationRoot, "*/task.loc.json");
            tl.debug(`Found multi-task manifests: ${versionManifests.join(", ")}`);
            tl.debug(`Found multi-task localized manifests: ${locVersionManifests.join(", ")}`);
            return (result).concat(versionManifests).concat(locVersionManifests);
        }
    }, []);
}
function writeManifest(manifest, path) {
    return fse.writeJSON(path, manifest);
}
exports.writeManifest = writeManifest;
function checkUpdateTasksManifests(manifestFile) {
    return updateManifests(manifestFile ? [manifestFile] : []);
}
exports.checkUpdateTasksManifests = checkUpdateTasksManifests;
//# sourceMappingURL=Common.js.map