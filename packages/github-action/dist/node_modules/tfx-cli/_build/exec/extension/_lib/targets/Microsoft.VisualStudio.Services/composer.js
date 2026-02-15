"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSSExtensionComposer = void 0;
const extension_composer_1 = require("../../extension-composer");
const vso_manifest_builder_1 = require("./vso-manifest-builder");
const vsix_manifest_builder_1 = require("../../vsix-manifest-builder");
class VSSExtensionComposer extends extension_composer_1.ExtensionComposer {
    getBuilders() {
        return super.getBuilders().concat([new vso_manifest_builder_1.VsoManifestBuilder(this.settings.root)]);
    }
    validate(components) {
        return super.validate(components).then(result => {
            let data = components.builders.filter(b => b.getType() === vso_manifest_builder_1.VsoManifestBuilder.manifestType)[0].getData();
            if (data.contributions.length === 0 && data.contributionTypes.length === 0) {
                result.push("Your extension must define at least one contribution or contribution type.");
            }
            // Validate that contribution ids are unique within the extension
            const ids = {};
            for (const contribution of data.contributions) {
                const id = contribution.id;
                if (ids[id]) {
                    result.push(`Your extension defined a duplicate contribution id '${id}'.`);
                }
                ids[id] = true;
            }
            data = components.builders.filter(b => b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType)[0].getData();
            const galleryFlags = data.PackageManifest.Metadata[0].GalleryFlags;
            const properties = data.PackageManifest.Metadata[0].Properties;
            if (galleryFlags && galleryFlags[0] && galleryFlags[0].toLowerCase().includes("paid")) {
                if (properties && properties.length > 0) {
                    const property = properties[0].Property.filter(prop => prop.$.Id === VSSExtensionComposer.SupportLink && prop.$.Value);
                    if (!property) {
                        result.push('Paid extensions are required to have a support link. Try adding it to your manifest: { "links": { "support": "<support url>" } }');
                    }
                }
                else {
                    result.push('Paid extensions are required to have a support link. Try adding it to your manifest: { "links": { "support": "<support url>" } }');
                }
            }
            return result;
        });
    }
}
exports.VSSExtensionComposer = VSSExtensionComposer;
VSSExtensionComposer.SupportLink = "Microsoft.VisualStudio.Services.Links.Support";
//# sourceMappingURL=composer.js.map