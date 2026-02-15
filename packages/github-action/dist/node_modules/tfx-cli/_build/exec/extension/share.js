"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionShare = exports.getCommand = void 0;
const args = require("../../lib/arguments");
const extBase = require("./default");
const extInfo = require("./_lib/extensioninfo");
const trace = require("../../lib/trace");
const publish_1 = require("./_lib/publish");
function getCommand(args) {
    return new ExtensionShare(args);
}
exports.getCommand = getCommand;
class ExtensionShare extends extBase.ExtensionBase {
    constructor(passedArgs) {
        super(passedArgs);
        this.description = "Share an Azure DevOps Extension with Azure DevOps Organizations.";
        this.serverCommand = true;
        this.registerCommandArgument("shareWith", "Share with", "List of organizations with which to share the extension.", args.ArrayArgument);
        this.registerCommandArgument("serviceUrl", "Market URL", "URL to the VSS Marketplace.", args.StringArgument, extBase.ExtensionBase.getMarketplaceUrl);
    }
    getHelpArgs() {
        return ["publisher", "extensionId", "vsix", "shareWith"];
    }
    async exec() {
        const galleryApi = await this.getGalleryApi();
        return this.commandArgs.vsix.val(true).then(vsixPath => {
            let extInfoPromise;
            if (vsixPath !== null) {
                extInfoPromise = extInfo.getExtInfo(vsixPath[0], null, null);
            }
            else {
                extInfoPromise = Promise.all([this.commandArgs.publisher.val(), this.commandArgs.extensionId.val()]).then(values => {
                    const [publisher, extension] = values;
                    return extInfo.getExtInfo(null, extension, publisher);
                });
            }
            return extInfoPromise.then(extInfo => {
                return this.commandArgs.shareWith.val().then(accounts => {
                    const sharingMgr = new publish_1.SharingManager({}, galleryApi, extInfo);
                    return sharingMgr.shareWith(accounts).then(() => accounts);
                });
            });
        });
    }
    friendlyOutput(data) {
        trace.success("\n=== Completed operation: share extension ===");
        trace.info(" - Shared with:");
        data.forEach(acct => {
            trace.info("   - " + acct);
        });
    }
}
exports.ExtensionShare = ExtensionShare;
//# sourceMappingURL=share.js.map