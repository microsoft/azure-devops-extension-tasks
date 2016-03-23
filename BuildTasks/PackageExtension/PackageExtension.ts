///<reference path="../typings/main.d.ts" />
import path = require("path");
import fs = require("fs");
import Q = require("q");
import tl = require("vsts-task-lib/task");
import common = require("./common");

const getTaskPathContributions = (manifestFile: string): Q.Promise<string[]> => {
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

const getTasksManifestPaths = (): Q.Promise<string[]> => {
    // Search for extension manifests given the rootFolder and patternManifest inputs
    const rootFolder = tl.getInput("rootFolder", false) || tl.getInput("System.DefaultWorkingDirectory");
    const manifestsPattern = tl.getInput("patternManifest", false) || "vss-extension.json";

    const globPattern = path.join(rootFolder, manifestsPattern);
    tl.debug(`Searching for extension manifests ${globPattern}`);

    const extensionManifestFiles = tl.glob(globPattern);

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
};

const updateTaskVersion = (manifestFilePath: string, version: { Major: string, Minor: string, Patch: string }): Q.Promise<void> => {
    tl.debug(`Reading task manifest ${manifestFilePath}`);
    return Q.nfcall(fs.readFile, manifestFilePath).then((data: string) => {
        let manifestJSON = JSON.parse(data);
        manifestJSON.version = version;
        const newContent = JSON.stringify(manifestJSON, null, "\t");
        return Q.nfcall(fs.writeFile, manifestFilePath, newContent).then(() => {
            tl.debug(`Task manifest ${manifestFilePath} version updated to  ${JSON.stringify(version)}`);
        });
    });
};

const checkUpdateTasksVersion = () => {
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

        getTasksManifestPaths().then(taskManifests => {
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
};

common.runTfx(tfx => {
    tfx.arg(["extension", "create", "--json"]);
    const outputVariable = tl.getInput("outputVariable", false);

    // Set tfx manifest arguments
    const cleanupTfxArgs = common.setTfxManifestArguments(tfx);

    // Set vsix output path
    const outputPath = tl.getInput("outputPath", false);
    tfx.argIf(outputPath, ["--output-path", outputPath]);

    // Aditional arguments
    tfx.arg(tl.getInput("arguments", false));

    // Set working directory
    const cwd = tl.getInput("cwd", false);
    if (cwd) { tl.cd(cwd); }

    // Before executing check update on tasks version
    checkUpdateTasksVersion().then(() => {
        const outputStream = new common.TfxJsonOutputStream();

        tfx.exec(<any>{ outStream: outputStream, failOnStdErr: true }).then(code => {
            const json = JSON.parse(outputStream.jsonString);

            if (outputVariable) {
                tl.setVariable(outputVariable, json.path);
            }

            tl._writeLine(`Packaged extension: ${json.path}.`);
            tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
        }).fail(err => {
            tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
        }).finally(() => {
            cleanupTfxArgs();
        });
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `Error occurred while updating tasks version: ${err}`);
    });
});

