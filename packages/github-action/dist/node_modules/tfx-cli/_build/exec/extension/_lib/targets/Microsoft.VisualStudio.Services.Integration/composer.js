"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSSIntegrationComposer = void 0;
const extension_composer_1 = require("../../extension-composer");
const vsix_manifest_builder_1 = require("../../vsix-manifest-builder");
const _ = require("lodash");
class VSSIntegrationComposer extends extension_composer_1.ExtensionComposer {
    validate(components) {
        return super.validate(components).then(result => {
            let vsixData = components.builders.filter(b => b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType)[0].getData();
            // Ensure that an Action link or a Getstarted link exists.
            let properties = _.get(vsixData, "PackageManifest.Metadata[0].Properties[0].Property", []);
            let pIds = properties.map(p => _.get(p, "$.Id"));
            if (_.intersection(["Microsoft.VisualStudio.Services.Links.Action", "Microsoft.VisualStudio.Services.Links.Getstarted"], pIds).length === 0) {
                result.push("An 'integration' extension must provide a 'getstarted' link.");
            }
            return result;
        });
    }
}
exports.VSSIntegrationComposer = VSSIntegrationComposer;
//# sourceMappingURL=composer.js.map