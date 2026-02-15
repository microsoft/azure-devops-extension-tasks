"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionPublish = exports.getCommand = void 0;
const create_1 = require("./create");
const args = require("../../lib/arguments");
const colors = require("colors");
const extBase = require("./default");
const publishUtils = require("./_lib/publish");
const trace = require("../../lib/trace");
function getCommand(args) {
    return new ExtensionPublish(args);
}
exports.getCommand = getCommand;
class ExtensionPublish extends extBase.ExtensionBase {
    constructor() {
        super(...arguments);
        this.description = "Publish a Visual Studio Marketplace Extension.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return [
            "root",
            "manifestJs",
            "env",
            "manifests",
            "manifestGlobs",
            "json5",
            "override",
            "overridesFile",
            "bypassScopeCheck",
            "bypassValidation",
            "publisher",
            "extensionId",
            "outputPath",
            "locRoot",
            "vsix",
            "shareWith",
            "noWaitValidation",
            "metadataOnly",
        ];
    }
    setCommandArgs() {
        super.setCommandArgs();
        this.registerCommandArgument("serviceUrl", "Market URL", "URL to the VSS Marketplace.", args.StringArgument, extBase.ExtensionBase.getMarketplaceUrl);
    }
    async exec() {
        const galleryApi = await this.getGalleryApi();
        let result = {};
        const publishSettings = await this.getPublishSettings();
        let extensionCreatePromise;
        if (publishSettings.vsixPath) {
            result.packaged = null;
        }
        else {
            // Run two async operations in parallel and destructure the result.
            const [mergeSettings, packageSettings] = await Promise.all([this.getMergeSettings(), this.getPackageSettings()]);
            const createdExtension = await (0, create_1.createExtension)(mergeSettings, packageSettings);
            result.packaged = createdExtension.path;
            publishSettings.vsixPath = createdExtension.path;
        }
        const packagePublisher = new publishUtils.PackagePublisher(publishSettings, galleryApi);
        const publishedExtension = await packagePublisher.publish();
        result.published = true;
        if (publishSettings.shareWith && publishSettings.shareWith.length >= 0) {
            const sharingMgr = new publishUtils.SharingManager(publishSettings, galleryApi);
            await sharingMgr.shareWith(publishSettings.shareWith);
            result.shared = publishSettings.shareWith;
        }
        else {
            result.shared = null;
        }
        return result;
    }
    friendlyOutput(data) {
        trace.info(colors.green("\n=== Completed operation: publish extension ==="));
        let packagingStr = data.packaged ? colors.green(data.packaged) : colors.yellow("not packaged (existing package used)");
        let publishingStr = data.published ? colors.green("success") : colors.yellow("???");
        let sharingStr = data.shared
            ? "shared with " + data.shared.map(s => colors.green(s)).join(", ")
            : colors.yellow("not shared (use --share-with to share)");
        trace.info(" - Packaging: %s", packagingStr);
        trace.info(" - Publishing: %s", publishingStr);
        trace.info(" - Sharing: %s", sharingStr);
    }
}
exports.ExtensionPublish = ExtensionPublish;
//# sourceMappingURL=publish.js.map