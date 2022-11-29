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
const toolLib = require("azure-pipelines-tool-lib/tool");
const taskLib = require("azure-pipelines-task-lib/task");
const tr = require("azure-pipelines-task-lib/toolrunner");
const path = require("path");
const os = require("os");
const fs = require("fs");
const debug = taskLib.getVariable("system.debug") || false;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const version = taskLib.getInput("version", true);
            const checkLatest = taskLib.getBoolInput("checkLatest", false) || false;
            yield getTfx(version, checkLatest);
            yield taskLib.tool("tfx").arg(["version", "--no-color"]).exec();
        }
        catch (error) {
            taskLib.setResult(taskLib.TaskResult.Failed, error.message);
        }
    });
}
function getTfx(versionSpec, checkLatest) {
    return __awaiter(this, void 0, void 0, function* () {
        if (toolLib.isExplicitVersion(versionSpec)) {
            checkLatest = false;
        }
        let toolPath;
        if (!checkLatest) {
            toolPath = toolLib.findLocalTool('tfx', versionSpec);
        }
        if (!toolPath) {
            let version;
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
                toolPath = yield acquireTfx(version);
            }
        }
        if (os.platform() !== "win32") {
            const probePaths = [toolPath, path.join(toolPath, "/bin"), path.join(toolPath, "/node_modules/.bin/")];
            toolPath = probePaths.find((probePath) => {
                return taskLib.exist(path.join(probePath, "/tfx"));
            });
        }
        taskLib.setVariable("__tfxpath", toolPath, false);
        toolLib.prependPath(toolPath);
    });
}
function queryLatestMatch(versionSpec) {
    const npmRunner = new tr.ToolRunner("npm");
    npmRunner.arg(["show", "tfx-cli", "versions", "--json"]);
    const result = npmRunner.execSync({ failOnStdErr: false, silent: !debug, ignoreReturnCode: false });
    if (result.code === 0) {
        const versions = JSON.parse(result.stdout.trim());
        const version = toolLib.evaluateVersions(versions, versionSpec);
        return version;
    }
    return "";
}
function acquireTfx(version) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            version = toolLib.cleanVersion(version);
            let extPath;
            taskLib.assertAgent('2.115.0');
            extPath = taskLib.getVariable('Agent.TempDirectory');
            if (!extPath) {
                throw new Error('Expected Agent.TempDirectory to be set');
            }
            extPath = path.join(extPath, 'tfx');
            taskLib.mkdirP(path.join(extPath));
            const npmRunner = new tr.ToolRunner("npm");
            npmRunner.arg(["install", "tfx-cli@" + version, "-g", "--prefix", extPath]);
            const result = npmRunner.execSync({ failOnStdErr: false, silent: !debug, ignoreReturnCode: false });
            if (result.code === 0) {
                if (os.platform() === "win32") {
                    fs.unlinkSync(path.join(extPath, "/tfx"));
                }
                return yield toolLib.cacheDir(extPath, 'tfx', version);
            }
        }
        catch (_a) {
            return Promise.reject(new Error("Failed to install tfx"));
        }
    });
}
void run();
//# sourceMappingURL=TfxInstaller.js.map