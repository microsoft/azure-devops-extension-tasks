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
const common = require("../Common/Common");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield common.runTfx(tfx => {
            try {
                tfx.arg(["extension", "unpublish", "--no-color"]);
                common.setTfxMarketplaceArguments(tfx);
                common.validateAndSetTfxManifestArguments(tfx);
                const result = tfx.execSync({ silent: false, failOnStdErr: false });
                if (result.code != 0) {
                    tl.setResult(tl.TaskResult.Failed, "Failed");
                }
                tl.setResult(tl.TaskResult.Succeeded, "Unpublished");
            }
            catch (err) {
                tl.setResult(tl.TaskResult.Failed, `Failed: ${err}`);
            }
        });
    });
}
void run();
//# sourceMappingURL=UnpublishExtension.js.map