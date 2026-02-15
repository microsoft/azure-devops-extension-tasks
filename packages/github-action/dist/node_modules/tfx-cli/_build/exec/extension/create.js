"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionCreate = exports.createExtension = exports.getCommand = void 0;
const merger_1 = require("./_lib/merger");
const vsix_manifest_builder_1 = require("./_lib/vsix-manifest-builder");
const vsix_writer_1 = require("./_lib/vsix-writer");
const colors = require("colors");
const extBase = require("./default");
const trace = require("../../lib/trace");
function getCommand(args) {
    return new ExtensionCreate(args);
}
exports.getCommand = getCommand;
function createExtension(mergeSettings, packageSettings) {
    return new merger_1.Merger(mergeSettings).merge().then(components => {
        return new vsix_writer_1.VsixWriter(packageSettings, components).writeVsix().then(outPath => {
            let vsixBuilders = components.builders.filter(b => b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType);
            let vsixBuilder;
            if (vsixBuilders.length > 0) {
                vsixBuilder = vsixBuilders[0];
            }
            return {
                path: outPath,
                extensionId: vsixBuilder ? vsixBuilder.getExtensionId() : null,
                version: vsixBuilder ? vsixBuilder.getExtensionVersion() : null,
                publisher: vsixBuilder ? vsixBuilder.getExtensionPublisher() : null,
            };
        });
    });
}
exports.createExtension = createExtension;
class ExtensionCreate extends extBase.ExtensionBase {
    constructor(passedArgs) {
        super(passedArgs);
        this.description = "Create a vsix package for an extension.";
        this.serverCommand = false;
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
            "revVersion",
            "bypassValidation",
            "publisher",
            "extensionId",
            "outputPath",
            "locRoot",
            "metadataOnly",
        ];
    }
    async exec() {
        return this.getMergeSettings().then(mergeSettings => {
            return this.getPackageSettings().then(packageSettings => {
                return createExtension(mergeSettings, packageSettings);
            });
        });
    }
    friendlyOutput(data) {
        trace.info(colors.green("\n=== Completed operation: create extension ==="));
        trace.info(" - VSIX: %s", data.path);
        trace.info(" - Extension ID: %s", data.extensionId);
        trace.info(" - Extension Version: %s", data.version);
        trace.info(" - Publisher: %s", data.publisher);
    }
}
exports.ExtensionCreate = ExtensionCreate;
//# sourceMappingURL=create.js.map