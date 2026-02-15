"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionShare = exports.getCommand = void 0;
const args = require("../../lib/arguments");
const errHandler = require("../../lib/errorhandler");
const extBase = require("./default");
const extInfo = require("./_lib/extensioninfo");
const trace = require("../../lib/trace");
function getCommand(args) {
    // this just offers description for help and to offer sub commands
    return new ExtensionShare(args);
}
exports.getCommand = getCommand;
class ExtensionShare extends extBase.ExtensionBase {
    constructor(passedArgs) {
        super(passedArgs);
        this.description = "Unshare a Azure Devops Extension with Azure DevOps Organizations.";
        this.serverCommand = true;
        // Override this argument so we are prompted (e.g. no default provided)
        this.registerCommandArgument("unshareWith", "Un-share with", "List of organizations with which to un-share the extension", args.ArrayArgument);
        this.registerCommandArgument("serviceUrl", "Market URL", "URL to the VSS Marketplace.", args.StringArgument, extBase.ExtensionBase.getMarketplaceUrl);
    }
    getHelpArgs() {
        return ["publisher", "extensionId", "vsix", "unshareWith"];
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
                return this.commandArgs.unshareWith.val().then(unshareWith => {
                    let sharePromises = [];
                    unshareWith.forEach(account => {
                        sharePromises.push(galleryApi.unshareExtension(extInfo.publisher, extInfo.id, account).catch(errHandler.httpErr));
                    });
                    return Promise.all(sharePromises).then(() => {
                        return unshareWith;
                    });
                });
            });
        });
    }
    friendlyOutput(data) {
        trace.success("\n=== Completed operation: un-share extension ===");
        trace.info(" - Removed sharing from:");
        data.forEach(acct => {
            trace.info("   - " + acct);
        });
    }
}
exports.ExtensionShare = ExtensionShare;
//# sourceMappingURL=unshare.js.map