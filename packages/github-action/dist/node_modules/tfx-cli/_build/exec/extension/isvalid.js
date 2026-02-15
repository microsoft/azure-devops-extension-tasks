"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionIsValid = exports.getCommand = void 0;
const args = require("../../lib/arguments");
const colors = require("colors");
const extBase = require("./default");
const publishUtils = require("./_lib/publish");
const trace = require("../../lib/trace");
function getCommand(args) {
    return new ExtensionIsValid(args);
}
exports.getCommand = getCommand;
class ExtensionIsValid extends extBase.ExtensionBase {
    constructor() {
        super(...arguments);
        this.description = "Show the validation status of a given extension.";
        this.serverCommand = true;
    }
    setCommandArgs() {
        super.setCommandArgs();
        this.registerCommandArgument("version", "Extension version", "Specify the version of the extension of which to get the validation status. Defaults to the latest version.", args.StringArgument, null);
        this.registerCommandArgument("serviceUrl", "Market URL", "URL to the VSS Marketplace.", args.StringArgument, extBase.ExtensionBase.getMarketplaceUrl);
    }
    getHelpArgs() {
        return ["publisher", "extensionId", "vsix", "version"];
    }
    async exec() {
        const galleryApi = await this.getGalleryApi();
        const extInfo = await this.identifyExtension();
        const version = await this.commandArgs.version.val();
        const sharingMgr = new publishUtils.SharingManager({}, galleryApi, extInfo);
        const validationStatus = await sharingMgr.getValidationStatus(version);
        return validationStatus;
    }
    friendlyOutput(data) {
        if (data === publishUtils.GalleryBase.validated) {
            trace.info(colors.green("Valid"));
        }
        else if (data === publishUtils.GalleryBase.validationPending) {
            trace.info(colors.yellow("Validation pending..."));
        }
        else {
            trace.info(colors.red("Validation error: " + data));
        }
    }
    jsonOutput(data) {
        const result = {
            status: "error",
        };
        if (data === publishUtils.GalleryBase.validationPending) {
            result.status = "pending";
        }
        else if (data === publishUtils.GalleryBase.validated) {
            result.status = "success";
        }
        else {
            result.message = data;
        }
        console.log(JSON.stringify(result, null, 4));
    }
}
exports.ExtensionIsValid = ExtensionIsValid;
//# sourceMappingURL=isvalid.js.map