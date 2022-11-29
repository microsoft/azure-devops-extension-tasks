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
const common = require("../../Common/v3/Common");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield common.runTfx((tfx) => __awaiter(this, void 0, void 0, function* () {
                let cleanupTfxArgs = null;
                try {
                    tfx.arg(["extension", "create", "--json", "--no-color"]);
                    const outputVariable = tl.getInput("outputVariable", false);
                    cleanupTfxArgs = common.validateAndSetTfxManifestArguments(tfx);
                    const outputPath = tl.getInput("outputPath", false);
                    tfx.argIf(outputPath, ["--output-path", outputPath]);
                    yield common.checkUpdateTasksManifests();
                    const outputStream = new common.TfxJsonOutputStream(console.log);
                    const code = yield tfx.exec({ outStream: outputStream, failOnStdErr: false });
                    if (code !== 0) {
                        throw `tfx exited with return code: ${code}`;
                    }
                    const json = JSON.parse(outputStream.jsonString);
                    if (outputVariable) {
                        tl.setVariable(outputVariable, json.path);
                    }
                    tl.setVariable("Extension.OutputPath", json.path);
                    console.log(`Packaged extension: ${json.path}.`);
                    tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
                }
                catch (err) {
                    tl.setResult(tl.TaskResult.Failed, `${err}`);
                }
                finally {
                    if (cleanupTfxArgs) {
                        cleanupTfxArgs();
                    }
                }
            }));
        }
        catch (err) {
            console.log(`Error packaging extension: ${err}.`);
            tl.setResult(tl.TaskResult.Failed, `Error packaging extension: ${err}`);
        }
    });
}
void run();
//# sourceMappingURL=PackageExtension.js.map