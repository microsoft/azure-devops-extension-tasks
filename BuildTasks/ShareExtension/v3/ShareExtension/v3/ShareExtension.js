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
void common.runTfx((tfx) => __awaiter(void 0, void 0, void 0, function* () {
    tfx.arg(["extension", "share", "--no-color"]);
    common.setTfxMarketplaceArguments(tfx);
    common.validateAndSetTfxManifestArguments(tfx);
    const accounts = tl.getDelimitedInput("accounts", ",", true);
    tfx.arg(["--share-with"].concat(accounts).map((value) => { return value.trim(); }));
    try {
        const code = yield tfx.exec();
        tl.setResult(tl.TaskResult.Succeeded, `tfx exited with return code: ${code}`);
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, `tfx failed with error: ${err}`);
    }
}));
//# sourceMappingURL=ShareExtension.js.map