"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionShow = exports.getCommand = void 0;
const args = require("../../lib/arguments");
const extBase = require("./default");
const publishUtils = require("./_lib/publish");
function getCommand(args) {
    return new ExtensionShow(args);
}
exports.getCommand = getCommand;
class ExtensionShow extends extBase.ExtensionBase {
    constructor() {
        super(...arguments);
        this.description = "Show info about a published Azure DevOps Services Extension.";
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
        return this.identifyExtension().then(extInfo => {
            let sharingMgr = new publishUtils.SharingManager({}, galleryApi, extInfo);
            return sharingMgr.getExtensionInfo();
        });
    }
}
exports.ExtensionShow = ExtensionShow;
//# sourceMappingURL=show.js.map