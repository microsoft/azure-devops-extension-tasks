import tr from 'azure-pipelines-task-lib/toolrunner.js';

import taskLib from 'azure-pipelines-task-lib/task.js';
import toolLib from 'azure-pipelines-tool-lib/tool.js';

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const debug = taskLib.getVariable("system.debug") || false;

try {
    const version = taskLib.getInput("version", true);
    const checkLatest = taskLib.getBoolInput("checkLatest", false) || false;
    const registry = taskLib.getInput("registry", false);

    await getTfx(version, checkLatest, registry);
    await taskLib.tool("tfx").arg(["version", "--no-color"]).execAsync();
}
catch (error: any) {
    taskLib.setResult(taskLib.TaskResult.Failed, error.message);
}

async function getTfx(versionSpec: string, checkLatest: boolean, registry?: string) {
    if (toolLib.isExplicitVersion(versionSpec)) {
        checkLatest = false; // check latest doesn't make sense when explicit version
    }

    let toolPath: string;
    if (!checkLatest) {
        toolPath = toolLib.findLocalTool('tfx', versionSpec);
    }

    if (!toolPath) {
        let version: string;
        if (toolLib.isExplicitVersion(versionSpec)) {
            version = versionSpec;
        }
        else {
            version = queryLatestMatch(versionSpec, registry);
            if (!version) {
                throw new Error(`Unable to find Tfx version '${versionSpec}'`);
            }

            toolPath = toolLib.findLocalTool('tfx', version);
        }

        if (!toolPath) {
            toolPath = await acquireTfx(version, registry);
        }
    }

    if (os.platform() !== "win32")
    {
        // Depending on target platform npm behaves slightly different. This seems to differ between distros and npm versions too.
        const probePaths = [toolPath, path.join(toolPath, "/bin"), path.join(toolPath, "/node_modules/.bin/")];
        toolPath = probePaths.find((probePath) => {
            return taskLib.exist(path.join(probePath, "/tfx"));
        });
    }

    taskLib.setVariable("__tfxpath", toolPath, false);
    toolLib.prependPath(toolPath);
}

function queryLatestMatch(versionSpec: string, registry?: string): string {
    const npmRunner = new tr.ToolRunner("npm");
    const args = ["show", "tfx-cli", "versions", "--json"];
    if (registry) {
        args.push("--registry", registry);
    }
    npmRunner.arg(args);
    const result = npmRunner.execSync({ failOnStdErr: false, silent: !debug, ignoreReturnCode: false} as tr.IExecOptions);
    if (result.code === 0)
    {
        const versions: string[] = JSON.parse(result.stdout.trim());
        const version: string = toolLib.evaluateVersions(versions, versionSpec);
        return version;
    }
    return "";
}

async function acquireTfx(version: string, registry?: string): Promise<string> {
    try{
        version = toolLib.cleanVersion(version);

        let extPath: string;
        taskLib.assertAgent('2.115.0');
        extPath = taskLib.getVariable('Agent.TempDirectory');
        if (!extPath) {
            throw new Error('Expected Agent.TempDirectory to be set');
        }
        extPath = path.join(extPath, 'tfx'); // use as short a path as possible due to nested node_modules folders

        taskLib.mkdirP(path.join(extPath));
        const npmRunner = new tr.ToolRunner("npm");
        const args = ["install", "tfx-cli@" + version, "-g", "--prefix", extPath, '--no-fund'];
        if (registry) {
            args.push("--registry", registry);
        }
        npmRunner.arg(args);

        const result = npmRunner.execSync({ failOnStdErr: false, silent: !debug, ignoreReturnCode: false} as tr.IExecOptions);
        if (result.code === 0)
        {
            if (os.platform() === "win32")
            {
                fs.unlinkSync(path.join(extPath, "/tfx"));
            }
            return await toolLib.cacheDir(extPath, 'tfx', version);
        }
    }
    catch {
        return Promise.reject(new Error("Failed to install tfx"));
    }
}
