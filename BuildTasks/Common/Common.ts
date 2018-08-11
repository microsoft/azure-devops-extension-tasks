//  W A R N I N G!
// This file is copied to each build task.
// Any change should be made in the file that is in the Common folder

import * as os from "os";
import * as path from "path";
import * as stream from "stream";
import * as fs from "fs";
import * as Q from "q";
import * as tl from "vsts-task-lib/task";
import * as trl from "vsts-task-lib/toolrunner";
import * as uri from "urijs";
import * as fse from "fs-extra";

import ToolRunner = trl.ToolRunner;
import * as uuidv5 from "uuidv5";

function writeBuildTempFile(taskName: string, data: any): string {
    let tempFile: string;
    do {
        // Let's add a random suffix
        let randomSuffix = Math.random().toFixed(6);
        tempFile = path.join(os.tmpdir(), `${taskName}-${randomSuffix}.tmp`);
    } while (fs.existsSync(tempFile));

    tl.debug(`Generating Build temp file: ${tempFile}`);
    fs.writeFileSync(tempFile, data);

    return tempFile;
}

function deleteBuildTempFile(tempFile: string) {
    if (tempFile && fs.existsSync(tempFile)) {
        tl.debug(`Deleting temp file: ${tempFile}`);
        fs.unlinkSync(tempFile);
    }
}

export function setProxy() {
    const proxy = tl.getHttpProxyConfiguration();

    if (proxy && !(process.env["HTTP_PROXY"] || process.env["HTTPS_PROXY"])) {
        let proxyUrl = new uri(proxy.proxyUrl);
        if (proxy.proxyUsername) {
            proxyUrl = proxyUrl.username(proxy.proxyUsername);
            proxyUrl = proxyUrl.password(proxy.proxyPassword);
        }
        process.env["HTTP_PROXY"] = proxyUrl.toString();
        process.env["HTTPS_PROXY"] = proxyUrl.toString();

        if (!process.env["NO_PROXY"]) {
            process.env["NO_PROXY"] = proxy.proxyBypassHosts.join(",");
        }
    }
}

/**
 * Set manifest related arguments for "tfx extension" command, such as
 * the  --root or the --manifest-globs switches.
 * @param  {ToolRunner} tfx
 * @returns {() => void} Cleaner function that the caller should use to cleanup temporary files created to be used as arguments
 */
export function validateAndSetTfxManifestArguments(tfx: ToolRunner): (() => void) {
    const rootFolder = tl.getInput("rootFolder", false);
    tfx.argIf(rootFolder, ["--root", rootFolder]);

    const globsManifest = tl.getInput("patternManifest", false);
    tfx.argIf(globsManifest, ["--manifest-globs", globsManifest]);

    // Overrides manifest file
    const publisher = tl.getInput("publisherId", false);

    const localizationRoot = tl.getInput("localizationRoot", false);
    tfx.argIf(localizationRoot, ["--loc-root", localizationRoot]);

    let extensionId = tl.getInput("extensionId", false);
    const extensionTag = tl.getInput("extensionTag", false);

    if (extensionId && extensionTag) {
        extensionId += extensionTag;
        tl.debug(`Overriding extension id to: ${extensionId}`);
    }

    // for backwards compat check both "method" and "fileType"
    switch (tl.getInput("method", false) || tl.getInput("fileType", false)) {
        // for backwards compat trigger on both "manifest" and "id"
        case "manifest":
        case "id":
        default:
            tfx.argIf(publisher, ["--publisher", publisher]);
            tfx.argIf(extensionId, ["--extension-id", extensionId]);
            break;

        case "vsix":
            let vsixFilePattern = tl.getPathInput("vsixFile", true);
            let matchingVsixFile: string[];
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

    let jsonOverrides: any;
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

        const isFree = extensionPricing.indexOf("free") >= 0;
        const isPaid = extensionPricing.indexOf("paid") >= 0;

        if (isPaid) {
            jsonOverrides.galleryFlags = jsonOverrides.galleryFlags || [];
            jsonOverrides.galleryFlags.push("Paid");
        }
    }

    let extensionVersion = getExtensionVersion();
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

    let overrideFilePath: string;
    if (jsonOverrides) {
        // Generate a temp file
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

/**
 * Run a tfx command by ensuring that "tfx" exists, installing it on the fly if needed.
 * @param  {(tfx:ToolRunner)=>void} cmd
 */
export async function runTfx(cmd: (tfx: ToolRunner) => void) {
    let tfx: ToolRunner;
    let tfxPath: string;

    const tryRunCmd = (tfx: ToolRunner) => {
        try {
            // Set working folder
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
    };

    const checkTfxGlobalVar = tl.getVariable("vstsDevTools.buildTasks.checkGlobalTfx");
    if (checkTfxGlobalVar && checkTfxGlobalVar.toLowerCase() !== "false") {
        console.log("Checking tfx globally");
        tfxPath = tl.which("tfx");
        if (tfxPath) {
            console.log(`Found tfx globally ${tfxPath}`);
            tfx = new trl.ToolRunner(tfxPath);
            tryRunCmd(tfx);
            return;
        }
    }

    // Check the local tfx to see if it is installed in the workfolder/_tools folder
    let agentToolsPath = path.join(tl.getVariable("Agent.Workfolder"), "/_tools/");
    let tfxLocalPathBin = path.join(agentToolsPath, "/node_modules/.bin/tfx");
    let tfxLocalPath = path.join(agentToolsPath, "/tfx");

    if (tl.osType() === "Windows_NT") {
        tfxLocalPathBin += ".cmd";
        tfxLocalPath += ".cmd";
    }

    console.log(`Checking tfx under: ${tfxLocalPath}`);
    tfxPath = tl.which(tfxLocalPath) || tl.which(tfxLocalPathBin);
    if (tfxPath) {
        console.log(`Found tfx under: ${tfxPath}`);
        tfx = new trl.ToolRunner(tfxPath);
        tryRunCmd(tfx);
        return;
    }

    console.log(`Could not find tfx command. Preparing to install it under: ${agentToolsPath}`);
    tl.mkdirP(path.join(agentToolsPath, "/node_modules/"));

    const npm = new trl.ToolRunner(tl.which("npm", true));
    npm.arg(["install", "tfx-cli", "--prefix", agentToolsPath]);

    npm.exec().then(code => {
        tfx = new trl.ToolRunner(tl.which(tfxLocalPath) || tl.which(tfxLocalPathBin, true));
        tryRunCmd(tfx);
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `Error installing tfx: ${err}`);
    });
}

/**
 * Reads the extension version from the 'extensionVersion' variable, extracting
 * just the part that is compatible with the versioning scheme used in the Marketplace.
 *
 * @returns string
 */
export function getExtensionVersion(): string {
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
    return null;
}

/**
 * Get the Marketplace endpoint details to be used while publishing or installing an extension.
 *
 * @param  {string="connectedServiceName"} inputFieldName
 * @returns string
 */
export function getMarketplaceEndpointDetails(inputFieldName): any {
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

/**
 * Sets the marketplace  endpoint details (url, credentials) for the toolrunner.
 *
 * @param  {ToolRunner} tfx
 * @returns string
 */
export function setTfxMarketplaceArguments(tfx: ToolRunner) {
    const connectTo = tl.getInput("connectTo", false) || "VsTeam";
    let galleryEndpoint;

    if (connectTo === "VsTeam") {
        galleryEndpoint = getMarketplaceEndpointDetails("connectedServiceName");
        tfx.arg(["--service-url", galleryEndpoint.url]);
        tfx.arg(["--auth-type", "pat"]);
        tfx.arg(["--token", galleryEndpoint.password]);
    } else {
        galleryEndpoint = getMarketplaceEndpointDetails("connectedServiceNameTFS");
        tfx.arg(["--service-url", galleryEndpoint.url]);

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

/**
 * A writable stream intended to be used with Tfx when using JSON output.
 * This class overcomes the problem of having tfx warnings being displayed
 * in stdout as regular messages, even when using --json switch in tfx.
 *
 */
export class TfxJsonOutputStream extends stream.Writable {

    jsonString: string = "";
    messages: string[] = [];
    commandline: string = "";

    constructor(public silent: boolean) {
        super();
    }

    _write(chunk: any, enc: string, cb: Function) {
        const chunkStr: string = chunk.toString();

        if (!this.commandline) {
            this.commandline = chunkStr;
            if (!this.silent) { this.taskOutput(chunkStr, console.log); }
        }
        else if (!this.jsonString && (chunkStr.toString()[0] !== "{" && chunkStr.toString()[0] !== "[")) {
            this.messages.push(chunkStr);
            if (!this.silent) { this.taskOutput(chunkStr, tl.warning); }
        }
        else {
            this.jsonString += chunkStr;
            this.taskOutput(chunkStr, tl.debug);
        }

        cb();
    }

    private taskOutput(messages: string, lineWriter: (m: string) => void) {
        if (!messages) { return; }
        // Split messages to be sure that we are invoking the write lineWriter for each lineWriter
        // Otherwise we could get messages in console with the wrong prefix used by vsts-task-lib
        messages.split("\n").forEach(lineWriter);
    }
}

function getTaskPathContributions(manifestFile: string): Q.Promise<string[]> {
    tl.debug(`Reading extension manifest file: ${manifestFile}`);

    return Q.nfcall(fs.readFile, manifestFile, "utf8").then((data: string) => {
        tl.debug(`Looking for task contributions in: ${manifestFile}`);
        // BOM check
        let manifestJSON;
        try {
            data = data.replace(/^\uFEFF/, (x) => {
                tl.warning(`Removing Unicode BOM from manifest file: ${manifestFile}.`);
                return "";
            });
            manifestJSON = JSON.parse(data);
        }
        catch (jsonError) {
            throw new Error(`Error parsing extension manifest: ${manifestFile} - ${jsonError}`);
        }

        // Check for task contributions
        if (!manifestJSON.contributions) { return []; }

        return manifestJSON.contributions
            .filter(c => c.type === "ms.vss-distributed-task.task" && c.properties && c.properties["name"])
            .map(c => c.properties["name"]);
    });
}

async function getTasksManifestPaths(manifestFile?: string): Promise<string[]> {
    let rootFolder: string;
    let extensionManifestFiles: string[];

    if (!manifestFile) {
        // Search for extension manifests given the rootFolder and patternManifest inputs
        rootFolder = tl.getInput("rootFolder", false) || tl.getInput("System.DefaultWorkingDirectory");
        const manifestsPattern = tl.getInput("patternManifest", false) || "vss-extension.json";

        tl.debug(`Searching for extension manifests ${manifestsPattern}`);

        extensionManifestFiles = tl.findMatch(rootFolder, manifestsPattern);
    }
    else {
        rootFolder = path.dirname(manifestFile);
        extensionManifestFiles = [manifestFile];
    }

    let result: string[] = new Array<string>();
    for (let m = 0; m < extensionManifestFiles.length; m++) {
        const manifest = extensionManifestFiles[m];
        tl.debug(`Found extension manifest: ${manifest}`);
        const tasks = await getTaskPathContributions(manifest);
        for (let t = 0; t < tasks.length; t++) {
            const task = tasks[t];
            tl.debug(`Found task: ${task}`);
            const taskRoot: string = path.join(rootFolder, task);
            const rootManifest: string = path.join(taskRoot, "task.json");
            if (fs.existsSync(rootManifest)) {
                tl.debug(`Found task manifest: ${rootManifest}`);
                result.push(rootManifest);
            } else {
                const versionManifests = tl.findMatch(taskRoot, `${task}V*/task.json`);
                tl.debug(`Found multi-version manifests: ${versionManifests.join(", ")}`);
                result = result.concat(versionManifests);
            }
        }
    }

    return result;
}

async function updateTaskId(manifestFilePath: string, ns: { publisher: string, extensionId: string }): Promise<any> {
    tl.debug(`Reading task manifest file: ${manifestFilePath}`);

    return fse.readFile(manifestFilePath, "utf8").then((data: string) => {
        let manifestJSON;
        try {
            // BOM check
            data = data.replace(/^\uFEFF/, (x) => {
                tl.warning(`Removing Unicode BOM from manifest file: ${manifestFilePath}.`);
                return "";
            });
            manifestJSON = JSON.parse(data);
        }
        catch (jsonError) {
            throw new Error(`Error parsing task manifest: ${manifestFilePath} - ${jsonError}`);
        }

        let extensionNs = uuidv5("url", "https://marketplace.visualstudio.com/vsts", true);
        manifestJSON.id = uuidv5(extensionNs, `${ns.publisher}.${ns.extensionId}.${manifestJSON.name}`, false);

        return manifestJSON;
    }).then((manifestJSON) => {
        return fse.writeJSON(manifestFilePath, manifestJSON, { encoding: "utf8" })
            .then(() => tl.debug(`Task manifest ${manifestFilePath} id updated to ${manifestJSON.id}`));
    });
}

async function updateTaskVersion(manifestFilePath: string, version: { major: number, minor: number, patch: number }, replacementType: string): Promise<any> {
    tl.debug(`Reading task manifest file: ${manifestFilePath}`);

    return fse.readFile(manifestFilePath, "utf8").then((data: string) => {
        let manifestJSON;
        try {
            data = data.replace(/^\uFEFF/,
                (x) => {
                    tl.warning(`Removing Unicode BOM from manifest file: ${manifestFilePath}.`);
                    return "";
                });
            manifestJSON = JSON.parse(data);
        } catch (jsonError) {
            throw new Error(`Error parsing task manifest: ${manifestFilePath} - ${jsonError}`);
        }

        tl.debug(`Task manifest ${manifestFilePath} replacement type: ${replacementType}`);
        if (!manifestJSON.version && replacementType !== "major") {
            tl.warning(
                `Task manifest ${manifestFilePath} doesn't specify a version, defaulting to replacement type: major.`);
            replacementType = "major";
            manifestJSON.version = version;
        } else {
            tl.debug(`Task manifest ${manifestFilePath} current version: ${JSON.stringify(manifestJSON.version)}`);
            switch (replacementType) {
            default:
            case "major":
                manifestJSON.version.Major = `${version.major}`;
            case "minor":
                manifestJSON.version.Minor = `${version.minor}`;
            case "patch":
                manifestJSON.version.Patch = `${version.patch}`;
            }
        }
        return manifestJSON;
    }).then((manifestJSON) => {
        return fse.writeJSON(manifestFilePath, manifestJSON, { encoding: "utf8" })
            .then(() => tl.debug(`Task manifest ${manifestFilePath} version updated to: ${JSON.stringify(manifestJSON.version)}`));
    });
}

/**
 *
 * Check whether the version update should be propagated to tasks included
 * in the extension.
 *
 */
export async function checkUpdateTasksManifests(manifestFile?: string): Promise<any> {
    // Check if we need to touch in tasks manifest before packaging
    const updateTasksVersion = tl.getBoolInput("updateTasksVersion", false);
    const updateTasksId = tl.getBoolInput("updateTasksId", false);
    let versionReplacementType = tl.getInput("updateTasksVersionType", false);
    if (!versionReplacementType || versionReplacementType.length === 0) {
        versionReplacementType = "majorminorpatch";
    }

    if (updateTasksVersion || updateTasksId) {
        // Extract the extension version
        let extensionVersion;
        extensionVersion = getExtensionVersion();

        // If extension version specified, let's search for build tasks
        if (extensionVersion || updateTasksId) {
            try {
                const taskManifests: string[] = await getTasksManifestPaths(manifestFile);

                if (taskManifests == null || taskManifests.length === 0) {
                    tl.debug("This extension has no build tasks on it.");
                    return Promise.resolve();
                }

                let taskVersionUpdates = [];
                if (extensionVersion) {
                    // Extract version parts Major, Minor, Patch
                    const versionParts = extensionVersion.split(".");
                    if (versionParts.length > 3) {
                        tl.warning("Detected a version that consists of more than 3 parts. Build tasks support only 3 parts, ignoring the rest.");
                    }

                    const taskVersion = { major: +versionParts[0], minor: +versionParts[1], patch: +versionParts[2] };

                    tl.debug(`Processing the following task manifest ${taskManifests}`);
                    taskVersionUpdates = taskManifests.map(manifest => updateTaskVersion(manifest, taskVersion, versionReplacementType));
                }

                let taskIdUpdates = [];
                if (updateTasksId) {
                    const publisher = tl.getInput("publisherId", false);
                    let extensionId = tl.getInput("extensionId", false);
                    const extensionTag = tl.getInput("extensionTag", false);

                    if (extensionId && extensionTag) {
                        extensionId += extensionTag;
                        tl.debug(`Overriding extension id to: ${extensionId}`);
                    }

                    if (!(publisher && extensionId)) {
                        const err = "Currently only supported when 'Publisher' and 'Extension Id' are specified.";
                        tl.setResult(tl.TaskResult.Failed, `${err}`);
                        throw err;
                    }

                    const ns = { publisher: publisher, extensionId: extensionId };

                    tl.debug(`Processing the following task manifest ${taskManifests}`);
                    taskIdUpdates = taskManifests.map(manifest => updateTaskId(manifest, ns));
                }

                return Promise.all(taskVersionUpdates)
                    .then((result) => { return Promise.all(taskIdUpdates); })
                    .catch((err) => tl.setResult(tl.TaskResult.Failed, err));
            } catch (err) {
                tl.setResult(tl.TaskResult.Failed, err);
            }
        }
        else {
            tl.debug("No update tasks version required (No extension version specified)");
        }
    }
    else {
        tl.debug("No update tasks version required");
    }

    return Promise.resolve();
}
