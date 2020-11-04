import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as taskLib from 'azure-pipelines-task-lib/task';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const debug = taskLib.getVariable("debug") || false;

async function run() 
{
    try {
        const version = taskLib.getInput("version", true);
        const checkLatest = taskLib.getBoolInput("checkLatest", false) || false;
        
        await getTfx(version, checkLatest);
        await taskLib.tool("tfx").arg(["version", "--no-color"]).exec();
    }
    catch (error) {
        taskLib.setResult(taskLib.TaskResult.Failed, error.message);
    }
}

async function getTfx(versionSpec: string, checkLatest: boolean) {
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

    if (os.platform() !== "win32")
    {
        toolPath = path.join(toolPath, "/node_modules/.bin/");
    }
    
    taskLib.setVariable("__tfxpath", toolPath, false);
    toolLib.prependPath(toolPath);
}

function queryLatestMatch(versionSpec: string): string {
    const npmRunner = new tr.ToolRunner("npm");
    npmRunner.arg(["show", "tfx-cli", "versions", "--json"]);
    const result = npmRunner.execSync({ failOnStdErr: false, silent: true, ignoreReturnCode: false} as tr.IExecOptions);
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
        npmRunner.arg(["install", "tfx-cli@" + version, "-g", "--prefix", extPath]);

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

void run();