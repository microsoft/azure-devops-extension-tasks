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
const tl = require("azure-pipelines-task-lib/task");
const common = require("../../Common/v4/Common");
const extensionVersionOverrideVariable = tl.getInput("extensionVersionOverride", false);
let usingOverride = false;
function setVersion(version) {
    if (tl.getBoolInput("setBuildNumber", false)) {
        tl.command("build.updatebuildnumber", null, version);
    }
    tl.setVariable("Extension.Version", version, false, true);
}
if (extensionVersionOverrideVariable) {
    tl.debug(`Override variable specified checking for value.`);
    const version = tl.getVariable(extensionVersionOverrideVariable);
    if (version) {
        console.log(`Ignoring Marketplace version and using supplied override: ${version}.`);
        setVersion(version);
        usingOverride = true;
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield common.runTfx((tfx) => __awaiter(this, void 0, void 0, function* () {
                try {
                    tfx.arg(["extension", "show", "--json", "--no-color"]);
                    common.setTfxMarketplaceArguments(tfx);
                    common.validateAndSetTfxManifestArguments(tfx);
                    const versionAction = tl.getInput("versionAction", false);
                    const outputStream = new common.TfxJsonOutputStream(console.log);
                    const errorStream = new common.TfxJsonOutputStream(tl.error);
                    const code = yield tfx.exec({ outStream: outputStream, errorStream: errorStream, failOnStdErr: false, ignoreReturnCode: false });
                    if (code !== 0) {
                        throw `tfx exited with return code: ${code}`;
                    }
                    const json = JSON.parse(outputStream.jsonString);
                    let version = json.versions[0].version;
                    console.log(`Latest version   : ${version}.`);
                    console.log(`Requested action : ${versionAction}.`);
                    if (versionAction !== "None") {
                        let versionparts = version.split(".").map(v => +v);
                        switch (versionAction) {
                            case "Major":
                                versionparts = [++versionparts[0], 0, 0];
                                break;
                            case "Minor":
                                versionparts = [versionparts[0], ++versionparts[1], 0];
                                break;
                            case "Patch":
                                versionparts = [versionparts[0], versionparts[1], ++versionparts[2]];
                                break;
                        }
                        version = versionparts.join(".");
                        console.log(`Updated to       : ${version}.`);
                    }
                    setVersion(version);
                    tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
                }
                catch (err) {
                    tl.setResult(tl.TaskResult.Failed, err);
                }
            }));
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, `Extension Version task failed: ${err}`);
        }
    });
}
if (!usingOverride) {
    void run();
}
//# sourceMappingURL=ExtensionVersion.js.map