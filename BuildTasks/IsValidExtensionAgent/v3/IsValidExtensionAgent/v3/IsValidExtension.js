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
const promiseRetry = require("promise-retry");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield common.runTfx((tfx) => __awaiter(this, void 0, void 0, function* () {
            try {
                tfx.arg(["extension", "isvalid", "--json", "--no-color"]);
                common.setTfxMarketplaceArguments(tfx);
                common.validateAndSetTfxManifestArguments(tfx);
                const options = {
                    retries: +tl.getInput("maxRetries", false) || 10,
                    factor: 1,
                    minTimeout: 1000 * 60 * (+tl.getInput("minTimeout", false) || 1),
                    maxTimeout: 1000 * 60 * (+tl.getInput("maxTimeout", false) || 15),
                    randomize: false
                };
                yield promiseRetry(options, (retry, attempt) => {
                    tl.debug(`Attempt: ${attempt}`);
                    const result = tfx.execSync({ silent: false, failOnStdErr: false });
                    const json = JSON.parse(result.stdout);
                    switch (json.status) {
                        case "pending":
                            return retry(json.status);
                        case "success":
                            return json.status;
                        default:
                            throw json.status;
                    }
                });
                tl.setResult(tl.TaskResult.Succeeded, "Extension is valid.");
            }
            catch (err) {
                tl.setResult(tl.TaskResult.Failed, `Extension validation failed: ${err}`);
            }
        }));
    });
}
void run();
//# sourceMappingURL=IsValidExtension.js.map