///<reference path="../typings/main.d.ts" />

//  W A R N I N G!
// This file is copied to each build task.
// Any change should be made in the file that is in the Common folder

import os = require("os");
import path = require("path");
import stream = require("stream");
import fs = require("fs");
import Q = require("q");
import tl = require("vsts-task-lib/task");
import trl = require("vsts-task-lib/toolrunner");
import ToolRunner = trl.ToolRunner;

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
/**
 * Set manifest related arguments for "tfx extension" command, such as
 * the  --root or the --manifest-globs switches.
 * @param  {ToolRunner} tfx
 * @returns {() => void} Cleaner function that the caller should use to cleanup temporary files created to be used as arguments
 */
export function setTfxManifestArguments(tfx: ToolRunner): (() => void) {
    const rootFolder = tl.getInput("rootFolder", false);
    tfx.argIf(rootFolder, ["--root", rootFolder]);

    const globsManifest = tl.getInput("patternManifest", false);
    tfx.argIf(globsManifest, ["--manifest-globs", globsManifest]);

    // Overrides manifest file
    const publisher = tl.getInput("publisherId", false);
    tfx.argIf(publisher, ["--publisher", publisher]);

    const localizationRoot = tl.getInput("localizationRoot", false);
    tfx.argIf(localizationRoot, ["--loc-root", localizationRoot]);

    let extensionId = tl.getInput("extensionId", false);
    const extensionTag = tl.getInput("extensionTag", false);

    if (extensionId && extensionTag) {
        extensionId += extensionTag;
        tl.debug(`Overriding extension id to: ${extensionId}`);
    }
    tfx.argIf(extensionId, ["--extension-id", extensionId]);

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
        if (isPreview) { jsonOverrides.galleryFlags = ["Preview"]; };
    }

    const extensionVersion = tl.getInput("extensionVersion", false);
    if (extensionVersion) {
        tl.debug(`Overriding extension version to: ${extensionVersion}`);
        jsonOverrides = (jsonOverrides || {});
        jsonOverrides.version = extensionVersion;
    }

    let overrideFilePath: string;
    if (jsonOverrides) {
        // Generate a temp file
        overrideFilePath = writeBuildTempFile("PackageTask", JSON.stringify(jsonOverrides));
        tl.debug(`Generated a JSON temp file to override manifest values Path: ${overrideFilePath}`);

        tfx.arg(["--overrides-file", overrideFilePath]);
    }

    return () => deleteBuildTempFile(overrideFilePath);
}
/**
 * Run a tfx command by ensuring that "tfx" exists, installing it on the fly if needed.
 * @param  {(tfx:ToolRunner)=>void} cmd
 */
export function runTfx(cmd: (tfx: ToolRunner) => void) {
    let tfx: ToolRunner;
    let tfxPath: string;

    const checkTfxGlobalVar = tl.getVariable("vstsDevTools.buildTasks.checkGlobalTfx");
    if (checkTfxGlobalVar && checkTfxGlobalVar.toLowerCase() !== "false") {
        console.log("Checking tfx globally");
        tfxPath = tl.which("tfx");
        if (tfxPath) {
            console.log(`Found tfx globally ${tfxPath}`);
            tfx = tl.createToolRunner(tfxPath);
            cmd(tfx);
            return;
        }
    }

    // Check the local tfx to see if it is included in task
    let tfxLocalPath = "node_modules/.bin/tfx";
    // On windows we are looking for tfx.cmd
    if (os.platform().toLowerCase().indexOf("win") >= 0) {
        tfxLocalPath += ".cmd";
    }

    console.log("Checking tfx in current task folder");
    tfxPath = tl.which(tfxLocalPath);
    if (tfxPath) {
        console.log(`Found tfx in current task folder ${tfxPath}`);
        tfx = tl.createToolRunner(tfxPath);
        cmd(tfx);
        return;
    }

    console.log(`Could not find tfx command. Preparing to install it in current task folder`);

    const npm = tl.createToolRunner(tl.which("npm", true));
    npm.arg(["install", "tfx-cli"]);

    npm.exec().then(code => {
        tfx = tl.createToolRunner(tl.which(tfxLocalPath, true));
        cmd(tfx);
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `Error installing tfx: ${err}`);
    });
}

/**
 * Get the Marketplace endpoint details to be used while publishing or installing an extension.
 *
 * @param  {string="connectedServiceName"} inputFieldName
 * @returns string
 */
export function getMarketplaceEndpointDetails(inputFieldName: string = "connectedServiceName"): { url: string, token: string } {
    const marketplaceEndpoint = tl.getInput(inputFieldName, true);
    const hostUrl = tl.getEndpointUrl(marketplaceEndpoint, false);
    const auth = tl.getEndpointAuthorization(marketplaceEndpoint, false);

    const apitoken = auth.parameters["password"];

    return {
        "url": hostUrl,
        "token": apitoken
    };
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

    constructor(public silent = false) {
        super();
    }

    _write(chunk: any, enc: string, cb: Function) {
        const chunkStr: string = chunk.toString();

        if (!this.commandline) {
            this.commandline = chunkStr;
            if (!this.silent) { this.taskOutput(chunkStr, tl._writeLine); }
        }
        else if (!this.jsonString && chunkStr.toString()[0] !== "{") {
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
    tl.debug(`Reading manifest file: ${manifestFile}`);

    return Q.nfcall(fs.readFile, manifestFile).then((data: string) => {
        tl.debug(`Looking for task contributions in ${manifestFile}`);
        const manifestJson: any = JSON.parse(data);

        // Check for task contributions
        if (!manifestJson.contributions) { return []; }

        return manifestJson.contributions
            .filter(c => c.type === "ms.vss-distributed-task.task" && c.properties && c.properties["name"])
            .map(c => c.properties["name"]);
    });
};

function getTasksManifestPaths(manifestFile?: string): Q.Promise<string[]> {
    let rootFolder: string;
    let extensionManifestFiles: string[];

    if (!manifestFile) {
        // Search for extension manifests given the rootFolder and patternManifest inputs
        rootFolder = tl.getInput("rootFolder", false) || tl.getInput("System.DefaultWorkingDirectory");
        const manifestsPattern = tl.getInput("patternManifest", false) || "vss-extension.json";

        const globPattern = path.join(rootFolder, manifestsPattern);
        tl.debug(`Searching for extension manifests ${globPattern}`);

        extensionManifestFiles = tl.glob(globPattern);
    }
    else {
        rootFolder = path.dirname(manifestFile);
        extensionManifestFiles = [manifestFile];
    }

    return Q.all(
        extensionManifestFiles.map(manifest => {
            return getTaskPathContributions(manifest).then(taskPaths => {
                tl.debug(`Found task contributions: ${taskPaths}`);
                return taskPaths.map(taskPath => path.join(rootFolder, taskPath, "task.json"));
            });
        })
    ).spread((...results: string[][]) => {
        // Merge the different contributions from different manifests
        return [].concat.apply([], results);
    });
}

function updateTaskVersion(manifestFilePath: string, version: { Major: string, Minor: string, Patch: string }): Q.Promise<void> {
    tl.debug(`Reading task manifest ${manifestFilePath}`);
    return Q.nfcall(fs.readFile, manifestFilePath).then((data: string) => {
        let manifestJSON = JSON.parse(data);
        manifestJSON.version = version;
        const newContent = JSON.stringify(manifestJSON, null, "\t");
        return Q.nfcall(fs.writeFile, manifestFilePath, newContent).then(() => {
            tl.debug(`Task manifest ${manifestFilePath} version updated to  ${JSON.stringify(version)}`);
        });
    });
}

/**
 *
 * Check whether the version update should be propagated to tasks included
 * in the extension.
 *
 */
export function checkUpdateTasksVersion(manifestFile?: string) {
    // Check if we need to touch in tasks manifest before packaging
    let extensionVersion = tl.getInput("extensionVersion", false);
    const updateTasksVersion = tl.getBoolInput("updateTasksVersion", false);
    let updateTasksFinished = Q.defer();

    if (extensionVersion && updateTasksVersion) {

        // Check extension version in format Major.Minor.Patch
        extensionVersion = extensionVersion.trim();
        if (!/^\d+\.\d+\.\d$/g.test(extensionVersion)) {
            throw new Error("Task Version not in expected format <Major>.<Minor>.<Patch>");
        }

        const versionParts = extensionVersion.split(".");
        const taskVersion = { Major: versionParts[0], Minor: versionParts[1], Patch: versionParts[2] };

        getTasksManifestPaths(manifestFile).then(taskManifests => {
            tl.debug(`Processing the following task manifest ${taskManifests}`);
            const taskUpdates = taskManifests.map(manifest => updateTaskVersion(manifest, taskVersion));

            Q.all(taskUpdates)
                .then(() => updateTasksFinished.resolve(null))
                .fail(err => updateTasksFinished.reject(`Error updating version in task manifests: ${err}`));

        }).fail(err => updateTasksFinished.reject(`Error determining tasks manifest paths: ${err}`));
    }
    else {
        tl.debug("No update tasks version required");
        updateTasksFinished.resolve(null);
    }

    return updateTasksFinished.promise;
}