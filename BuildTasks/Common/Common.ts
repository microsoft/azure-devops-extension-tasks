///<reference path="../typings/main.d.ts" />

//  W A R N I N G!
// This file is copied to each build task.
// Any change should be made in the file that is in the Common folder

import os = require("os");
import path = require("path");
import stream = require("stream");
import fs = require("fs");
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

    const extensionId = tl.getInput("extensionId", false);
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
        jsonOverrides.public = (extensionVisibility === "public");
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
            if (!this.silent) { tl._writeLine(this.commandline); }
        }
        else if (!this.jsonString && chunkStr.toString()[0] !== "{" ) {
            this.messages.push(chunkStr);
            if (!this.silent) { tl.warning(chunkStr); }
        }
        else {
            this.jsonString += chunkStr;
        }

        // Emit a debug for each line to avoid having it displayed in console
        chunkStr.split("\n").forEach(m => tl.debug(m));

        cb();
    }
}