"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionUnpublish = exports.getCommand = void 0;
const args = require("../../lib/arguments");
const extBase = require("./default");
const trace = require("../../lib/trace");
function getCommand(args) {
    return new ExtensionUnpublish(args);
}
exports.getCommand = getCommand;
class ExtensionUnpublish extends extBase.ExtensionBase {
    constructor() {
        super(...arguments);
        this.description = "Unpublish (delete) an extension from the Marketplace.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["publisher", "extensionId", "vsix"];
    }
    setCommandArgs() {
        super.setCommandArgs();
        this.registerCommandArgument("serviceUrl", "Market URL", "URL to the VSS Marketplace.", args.StringArgument, extBase.ExtensionBase.getMarketplaceUrl);
    }
    async exec() {
        const galleryApi = await this.getGalleryApi();
        const extInfo = await this.identifyExtension();
        await galleryApi.deleteExtension(extInfo.publisher, extInfo.id);
        return true;
    }
    friendlyOutput() {
        trace.success("\n=== Completed operation: unpublish extension ===");
    }
}
exports.ExtensionUnpublish = ExtensionUnpublish;
//# sourceMappingURL=unpublish.js.map