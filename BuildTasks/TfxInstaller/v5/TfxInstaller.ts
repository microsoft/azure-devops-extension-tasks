import tr from 'azure-pipelines-task-lib/toolrunner.js';

import taskLib from 'azure-pipelines-task-lib/task.js';
import toolLib from 'azure-pipelines-tool-lib/tool.js';

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const debug = taskLib.getVariable("system.debug") || false;

/**
 * Finds the tfx executable by probing common paths where it might be located
 * @param basePath The base path to start probing from
 * @returns The path where tfx executable was found, or undefined if not found
 */
function findTfxExecutablePath(basePath: string): string | undefined {
    const probePaths = [basePath, path.join(basePath, ".bin"), path.join(basePath, "bin"), path.join(basePath, "node_modules", ".bin")];
    const result = probePaths.find((probePath) => {
        if (os.platform() === "win32") {
            return taskLib.exist(path.join(probePath, "tfx.cmd"));
        }
        else {
            return taskLib.exist(path.join(probePath, "tfx"));
        }
    });
    return result;
}

try {
    const version = taskLib.getInput("version", true);
    const checkLatest = taskLib.getBoolInput("checkLatest", false) || false;

    await getTfx(version, checkLatest);
    await taskLib.tool("tfx").arg(["version", "--no-color"]).execAsync();
}
catch (error: any) {
    taskLib.setResult(taskLib.TaskResult.Failed, error.message);
}

async function getTfx(versionSpec: string, checkLatest: boolean): Promise<void> {
    if (versionSpec === "builtin") {
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const builtInTfxPath = findTfxExecutablePath(path.join(currentDir, "..", ".."));

        if (os.platform() !== "win32") {
            
            fs.chmodSync(path.join(builtInTfxPath, "tfx"), 0o777);
        }

        taskLib.setVariable("__tfxpath", builtInTfxPath, false);
        toolLib.prependPath(builtInTfxPath);
        return;
    }

    if (versionSpec === "latest") {
        versionSpec = "*";    
    }
    
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
            version = queryLatestMatch(versionSpec);
            if (!version) {
                throw new Error(`Unable to find Tfx version '${versionSpec}'`);
            }

            toolPath = toolLib.findLocalTool('tfx', version);
        }

        if (!toolPath) {
            toolPath = await acquireTfx(version);
        }
    }

    toolPath = findTfxExecutablePath(toolPath);
    taskLib.setVariable("__tfxpath", toolPath, false);
    toolLib.prependPath(toolPath);
}

function queryLatestMatch(versionSpec: string): string {
    const npmRunner = new tr.ToolRunner("npm");
    npmRunner.arg(["show", "tfx-cli", "versions", "--json"]);
    const result = npmRunner.execSync({ failOnStdErr: false, silent: !debug, ignoreReturnCode: false} as tr.IExecOptions);
    if (result.code === 0)
    {
        const versions: string[] = JSON.parse(result.stdout.trim());
        const version: string = toolLib.evaluateVersions(versions, versionSpec);
        return version;
    }
    return "";
}

async function acquireTfx(version: string): Promise<string> {
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
        npmRunner.arg(["install", "tfx-cli@" + version, "-g", "--prefix", extPath, '--no-fund']);

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
