///<reference path="../typings/main.d.ts" />

//  W A R N I N G!
// This file is copied to each build task.
// Any change should be made in the file that is in the Common folder

import os = require("os");
import path = require("path");
import fs = require("fs");
import tl = require("vsts-task-lib/task");
import trl = require("vsts-task-lib/toolrunner");
import ToolRunner = trl.ToolRunner;

function writeBuildTempFile(taskName: string, data: any): string {
    const buildNumber = tl.getVariable("Build.BuildNumber");
    let tempFile: string;
    do {
        // Let's add a random suffix
        let randomSuffix = Math.random().toFixed(6);
        tempFile = path.join(os.tmpdir(), `${taskName}-${buildNumber}-${randomSuffix}.tmp`);
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

    // Check tfx in a build installation path
    const tfxInstallBasePath = path.join(tl.getVariable("Agent.BuildDirectory"), "_tools", "tfx-cli");
    const tfxInstallPath = path.join(tfxInstallBasePath, tl.getVariable("Build.DefinitionVersion"));
    const tfxBuildPath = path.join(tfxInstallPath, tfxLocalPath);

    console.log(`Checking tfx in build path (${tfxBuildPath})`);
    tfxPath = tl.which(tfxBuildPath);
    if (tfxPath) {
        console.log(`Found tfx in ${tfxPath}`);
        tfx = tl.createToolRunner(tfxPath);
        cmd(tfx);
        return;
    }


    console.log(`Could not find tfx command. Preparing to install it in ${tfxInstallPath}`);

    const npm = tl.createToolRunner(tl.which("npm", true));
    npm.arg(["install", "tfx-cli"]);

    // Ensure tools dir exists in build
    if (!tl.exist(tfxInstallPath)) {
        // We are about to install tfx-cli for a new version definition. Delete previous versions to deleteBuildTempFile
        if (tl.exist(tfxInstallBasePath)) {
            console.log("Removing tfx-cli installed in previous versions");
            tl.rmRF(tfxInstallBasePath, true);
        }

        tl.mkdirP(tfxInstallPath);
    }

    const tfxInstallOptions = <trl.IExecOptions> { cwd: tfxInstallPath };
    npm.exec(tfxInstallOptions).then(code => {
      tfx = tl.createToolRunner(tl.which(tfxBuildPath, true));
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