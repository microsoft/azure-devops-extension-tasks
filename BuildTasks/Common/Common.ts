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

    // Check the global tfx
    let tfxPath = tl.which("tfx");
    if (tfxPath) {
        tfx = tl.createToolRunner(tfxPath);
        cmd(tfx);
        return;
    }

    // Check the local tfx (due a previous installation)
    let tfxLocalPath = "node_modules/.bin/tfx";
    // On windows we are looking for tfx.cmd
    if (os.platform().toLowerCase().indexOf("win") >= 0) {
        tfxLocalPath += ".cmd";
    }

    tfxPath = tl.which(tfxLocalPath);
    if (tfxPath) {
        tfx = tl.createToolRunner(tfxPath);
        cmd(tfx);
        return;
    }

    console.log("Could not find tfx command. Preparing to install it");

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