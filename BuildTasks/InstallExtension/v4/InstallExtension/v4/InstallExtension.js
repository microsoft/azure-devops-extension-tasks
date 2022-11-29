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
const accounts = tl.getDelimitedInput("accounts", ",", true).map((value) => { return value.trim(); });
void accounts.forEach((account) => __awaiter(void 0, void 0, void 0, function* () {
    return yield common.runTfx(tfx => {
        try {
            tfx.arg(["extension", "install", "--no-color"]);
            common.setTfxMarketplaceArguments(tfx, false);
            common.validateAndSetTfxManifestArguments(tfx);
            tfx.arg(["--service-url", account]);
            const result = tfx.execSync({ silent: false, failOnStdErr: false });
            if (result.stderr.search("error: Error: (?=.*TF1590010)") >= 0) {
                tl.warning("Task already installed in target account - Ignoring error TF1590010 returned by tfx.");
                tl.setResult(tl.TaskResult.Succeeded, "Ignored");
            }
            if (result.stderr.search("error: Error: (?!.*TF1590010)") >= 0) {
                tl.setResult(tl.TaskResult.Failed, "Failed");
            }
            tl.setResult(tl.TaskResult.Succeeded, "Installed");
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, `Failed: ${err}`);
        }
    });
}));
//# sourceMappingURL=InstallExtension.js.map