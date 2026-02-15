"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VsixManifestBuilder = void 0;
const manifest_1 = require("./manifest");
const utils_1 = require("./utils");
const _ = require("lodash");
const childProcess = require("child_process");
const onecolor = require("onecolor");
const os = require("os");
const path = require("path");
const trace = require("../../../lib/trace");
const winreg = require("winreg");
class VsixManifestBuilder extends manifest_1.ManifestBuilder {
    constructor(extRoot) {
        super(extRoot);
        _.set(this.data, "PackageManifest.$", {
            Version: "2.0.0",
            xmlns: "http://schemas.microsoft.com/developer/vsx-schema/2011",
            "xmlns:d": "http://schemas.microsoft.com/developer/vsx-schema-design/2011",
        });
        _.set(this.data, "PackageManifest.Metadata[0].Identity[0].$", { Language: "en-US" });
        _.set(this.data, "PackageManifest.Dependencies", [""]);
    }
    /**
     * Explains the type of manifest builder
     */
    getType() {
        return VsixManifestBuilder.manifestType;
    }
    getContentType() {
        return "text/xml";
    }
    /**
     * Gets the package path to this manifest
     */
    getPath() {
        return "extension.vsixmanifest";
    }
    /**
     * VSIX Manifest loc assets are vsixlangpack files.
     */
    getLocPath() {
        return "Extension.vsixlangpack";
    }
    /**
     * Gets the contents of the vsixLangPack file for this manifest
     */
    getLocResult(translations, defaults) {
        let langPack = this.generateVsixLangPack(translations, defaults);
        return [
            {
                partName: "Extension.vsixlangpack",
                path: null,
                content: (0, utils_1.jsonToXml)(langPack),
            },
        ];
    }
    generateVsixLangPack(translations, defaults) {
        return {
            VsixLanguagePack: {
                $: {
                    Version: "1.0.0",
                    xmlns: "http://schemas.microsoft.com/developer/vsx-schema-lp/2010",
                },
                LocalizedName: [translations["displayName"] || defaults["displayName"] || null],
                LocalizedDescription: [translations["description"] || defaults["description"] || null],
                LocalizedReleaseNotes: [translations["releaseNotes"] || defaults["releaseNotes"] || null],
                License: [null],
                MoreInfoUrl: [null],
            },
        };
    }
    /**
     * Add an <Asset> entry to the vsixmanifest.
     */
    addAssetToManifest(assetPath, type, addressable = false, lang = null) {
        let cleanAssetPath = (0, utils_1.toZipItemName)(assetPath);
        let types;
        if (typeof type === "string") {
            types = [type];
        }
        else {
            types = type;
        }
        types.forEach(type => {
            let asset = {
                Type: type,
                "d:Source": "File",
                Path: cleanAssetPath,
            };
            if (addressable) {
                asset["Addressable"] = "true";
            }
            if (lang) {
                asset["Lang"] = lang;
            }
            let assetElem = _.get(this.data, "PackageManifest.Assets[0].Asset", []);
            assetElem.push({
                $: asset,
            });
            _.set(this.data, "PackageManifest.Assets[0].Asset", assetElem);
            if (type === "Microsoft.VisualStudio.Services.Icons.Default") {
                _.set(this.data, "PackageManifest.Metadata[0].Icon[0]", cleanAssetPath);
            }
            if (type === "Microsoft.VisualStudio.Services.Content.License") {
                _.set(this.data, "PackageManifest.Metadata[0].License[0]", cleanAssetPath);
            }
        });
    }
    /**
     * Add a property to the vsixmanifest.
     */
    addProperty(id, value) {
        let defaultProperties = [];
        let existingProperties = _.get(this.data, "PackageManifest.Metadata[0].Properties[0].Property", defaultProperties);
        if (defaultProperties === existingProperties) {
            _.set(this.data, "PackageManifest.Metadata[0].Properties[0].Property", defaultProperties);
        }
        existingProperties.push({
            $: {
                Id: id,
                Value: value,
            },
        });
    }
    /**
     * Given a key/value pair, decide how this effects the manifest
     */
    processKey(key, value, override) {
        switch (key.toLowerCase()) {
            case "namespace":
            case "extensionid":
            case "id":
                if (_.isString(value)) {
                    this.singleValueProperty("PackageManifest.Metadata[0].Identity[0].$.Id", value, "namespace/extensionId/id", override);
                }
                break;
            case "version":
                this.singleValueProperty("PackageManifest.Metadata[0].Identity[0].$.Version", value, key, override);
                break;
            case "name":
                this.singleValueProperty("PackageManifest.Metadata[0].DisplayName[0]", value, key, override);
                break;
            case "description":
                _.set(this.data, "PackageManifest.Metadata[0].Description[0].$", { "xml:space": "preserve" });
                this.singleValueProperty("PackageManifest.Metadata[0].Description[0]._", value, key, override);
                break;
            case "icons":
                Object.keys(value).forEach(key => {
                    let iconType = _.startCase(key.toLowerCase());
                    let fileDecl = {
                        path: value[key],
                        addressable: true,
                        auto: true,
                        assetType: "Microsoft.VisualStudio.Services.Icons." + iconType,
                    };
                    this.addFile(fileDecl, true);
                });
                break;
            case "screenshots":
                if (_.isArray(value)) {
                    let screenshotIndex = 0;
                    value.forEach((screenshot) => {
                        let fileDecl = {
                            path: screenshot.path,
                            addressable: true,
                            auto: true,
                            assetType: "Microsoft.VisualStudio.Services.Screenshots." + ++screenshotIndex,
                            contentType: screenshot.contentType,
                        };
                        this.addFile(fileDecl, true);
                    });
                }
                break;
            case "content":
                Object.keys(value).forEach(key => {
                    let contentKey = _.startCase(key.toLowerCase());
                    if (value[key].path) {
                        let fileDecl = {
                            path: value[key].path,
                            addressable: true,
                            auto: true,
                            assetType: "Microsoft.VisualStudio.Services.Content." + contentKey,
                        };
                        if (value[key].contentType) {
                            fileDecl.contentType = value[key].contentType;
                        }
                        this.addFile(fileDecl, true);
                    }
                    else {
                        trace.warn("Did not find 'path' property for content item '%s'. Ignoring.", key);
                    }
                });
                break;
            case "details":
                if (_.isObject(value) && value.path) {
                    let fileDecl = {
                        path: value.path,
                        addressable: true,
                        auto: true,
                        assetType: "Microsoft.VisualStudio.Services.Content.Details",
                        contentType: value.contentType,
                    };
                    this.addFile(fileDecl, true);
                }
                break;
            case "targets":
                if (_.isArray(value)) {
                    let existingTargets = _.get(this.data, "PackageManifest.Installation[0].InstallationTarget", []);
                    value.forEach((target) => {
                        if (!target.id) {
                            return;
                        }
                        let newTargetAttrs = {
                            Id: target.id,
                        };
                        if (target.version) {
                            newTargetAttrs["Version"] = target.version;
                        }
                        existingTargets.push({
                            $: newTargetAttrs,
                        });
                    });
                    _.set(this.data, "PackageManifest.Installation[0].InstallationTarget", existingTargets);
                }
                break;
            case "links":
                if (_.isObject(value)) {
                    Object.keys(value).forEach(linkType => {
                        let url = _.get(value, linkType + ".uri") || _.get(value, linkType + ".url");
                        if (url) {
                            let linkTypeCased = _.capitalize(_.camelCase(linkType));
                            this.addProperty("Microsoft.VisualStudio.Services.Links." + linkTypeCased, url);
                        }
                        else {
                            trace.warn("'uri' property not found for link: '%s'... ignoring.", linkType);
                        }
                    });
                }
                break;
            case "repository":
                if (_.isObject(value)) {
                    const { type, url, uri } = value;
                    if (!type) {
                        throw new Error("Repository must have a 'type' property.");
                    }
                    if (type !== "git") {
                        throw new Error("Currently 'git' is the only supported repository type.");
                    }
                    if (!url && !uri) {
                        throw new Error("Repository must contain a 'url' property.");
                    }
                    this.addProperty("Microsoft.VisualStudio.Services.Links.GitHub", url || uri);
                }
                break;
            case "badges":
                if (_.isArray(value)) {
                    let existingBadges = _.get(this.data, "PackageManifest.Metadata[0].Badges[0].Badge", []);
                    value.forEach((badge) => {
                        existingBadges.push({
                            $: {
                                Link: badge.link || badge.href,
                                ImgUri: badge.imgUri || badge.uri,
                                Description: badge.description,
                            },
                        });
                    });
                    _.set(this.data, "PackageManifest.Metadata[0].Badges[0].Badge", existingBadges);
                }
                break;
            case "branding":
                if (_.isObject(value)) {
                    Object.keys(value).forEach(brandingType => {
                        let brandingTypeCased = _.capitalize(_.camelCase(brandingType));
                        let brandingValue = value[brandingType];
                        if (brandingTypeCased === "Color") {
                            try {
                                brandingValue = onecolor(brandingValue).hex();
                            }
                            catch (e) {
                                throw "Could not parse branding color as a valid color. Please use a hex or rgb format, e.g. #00ff00 or rgb(0, 255, 0)";
                            }
                        }
                        this.addProperty("Microsoft.VisualStudio.Services.Branding." + brandingTypeCased, brandingValue);
                    });
                }
                break;
            case "customerqnasupport":
                if (_.isObject(value)) {
                    // Normalize keys by fixing casing
                    Object.keys(value).forEach(k => {
                        const lck = k.toLowerCase();
                        if (lck === "url" || lck === "uri") {
                            value["url"] = value[k];
                        }
                        if (lck === "enablemarketplaceqna") {
                            value["enableMarketplaceQnA"] = value[k];
                        }
                    });
                    const qnaSupportVal = value;
                    if (typeof qnaSupportVal.enableMarketplaceQnA === "boolean") {
                        this.addProperty("Microsoft.VisualStudio.Services.EnableMarketplaceQnA", String(qnaSupportVal.enableMarketplaceQnA));
                    }
                    if (typeof qnaSupportVal.url === "string") {
                        this.addProperty("Microsoft.VisualStudio.Services.CustomerQnALink", qnaSupportVal.url);
                    }
                }
                break;
            case "githubflavoredmarkdown":
                if (typeof value !== "boolean") {
                    throw "Value for gitHubFlavoredMarkdown is invalid. Only boolean values are allowed.";
                }
                this.addProperty("Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown", value.toString());
                break;
            case "public":
                if (typeof value === "boolean") {
                    let flags = _.get(this.data, "PackageManifest.Metadata[0].GalleryFlags[0]", "").split(" ");
                    _.remove(flags, v => v === "");
                    if (value === true) {
                        flags.push("Public");
                    }
                    if (value === false) {
                        _.remove(flags, v => v === "Public");
                    }
                    _.set(this.data, "PackageManifest.Metadata[0].GalleryFlags[0]", _.uniq(flags).join(" "));
                }
                else {
                    throw new Error("The value for `public` must be a boolean true or false.");
                }
                break;
            case "publisher":
                this.singleValueProperty("PackageManifest.Metadata[0].Identity[0].$.Publisher", value, key, override);
                break;
            case "releasenotes":
                this.singleValueProperty("PackageManifest.Metadata[0].ReleaseNotes[0]", value, key, override);
                break;
            case "tags":
                this.handleDelimitedList(value, "PackageManifest.Metadata[0].Tags[0]");
                break;
            case "galleryflags":
                // Gallery Flags are space-separated since it's a Flags enum.
                this.handleDelimitedList(value, "PackageManifest.Metadata[0].GalleryFlags[0]", " ", true);
                break;
            case "categories":
                this.handleDelimitedList(value, "PackageManifest.Metadata[0].Categories[0]");
                break;
            case "files":
                if (_.isArray(value)) {
                    value.forEach((asset) => {
                        this.addFile(asset);
                    });
                }
                break;
            case "showpricingcalculator":
                if (typeof value !== "boolean") {
                    throw new Error("Value for showPricingCalculator is invalid. Only boolean values are allowed.");
                }
                this.addProperty("Microsoft.VisualStudio.Services.Content.Pricing.PriceCalculator", value.toString());
                break;
            case "galleryproperties":
                /**
                 * The Gallery Properties would be a generic array of JSON elements
                 */
                let normalizedValue = value;
                if (_.isObject(value)) {
                    normalizedValue = Object.keys(value).map(k => {
                        return { [k]: value[k] };
                    });
                }
                if (_.isArray(normalizedValue)) {
                    normalizedValue.forEach(propertyGroup => {
                        Object.keys(propertyGroup).forEach((propertyKey) => {
                            if (typeof propertyKey === "string" && propertyKey.length > 0 && propertyGroup[propertyKey]) {
                                let propertyName;
                                if (_.startsWith(propertyKey, "Microsoft.")) {
                                    propertyName = propertyKey;
                                }
                                else {
                                    // Property ID would be in upper camel case (First letter Capital)
                                    let ucck = _.upperFirst(propertyKey);
                                    propertyName = "Microsoft.VisualStudio.Services.GalleryProperties." + ucck;
                                }
                                // Check for duplicates
                                let existingProperties = _.get(this.data, "PackageManifest.Metadata[0].Properties[0].Property", []);
                                let pIds = existingProperties.map(p => _.get(p, "$.Id"));
                                if (_.intersection([propertyName], pIds).length !== 0) {
                                    trace.warn("multiple entries found for the same property group in the extension manifest ... ignoring the duplicates.");
                                }
                                else {
                                    this.addProperty(propertyName, String(propertyGroup[propertyKey]));
                                }
                            }
                            else {
                                trace.warn("incorrectly formed property group in the extension manifest ... ignoring.");
                            }
                        });
                    });
                }
                break;
        }
    }
    /**
     * Get the id of the extension this vsixmanifest goes to
     */
    getExtensionId() {
        return _.get(this.data, "PackageManifest.Metadata[0].Identity[0].$.Id");
    }
    /**
     * The JSON structure is fairly exotic since the result is an XML file,
     * so change those exotic keys to easy-to-read ones.
     */
    getLocKeyPath(path) {
        switch (path) {
            case "PackageManifest.Metadata.0.Description.0._":
                return "description";
            case "PackageManifest.Metadata.0.DisplayName.0":
                return "displayName";
            default:
                return path;
        }
    }
    /**
     * Get the publisher this vsixmanifest goes to
     */
    getExtensionPublisher() {
        return _.get(this.data, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
    }
    /**
     * Get the version of the extension this vsixmanifest goes to
     */
    getExtensionVersion() {
        return _.get(this.data, "PackageManifest.Metadata[0].Identity[0].$.Version");
    }
    /**
     * --Ensures an <Asset> entry is added for each file as appropriate
     * --Builds the [Content_Types].xml file
     */
    finalize(files, resourceData, builders) {
        return super.finalize(files, resourceData, builders).then(() => {
            // Default installation target to VSS if not provided (and log warning)
            let installationTarget = _.get(this.data, "PackageManifest.Installation[0].InstallationTarget");
            if (resourceData) {
                Object.keys(resourceData).forEach(languageTag => {
                    if (languageTag === "defaults") {
                        return;
                    }
                    builders.forEach(builder => {
                        const locResult = builder.getLocResult(resourceData[languageTag], resourceData.defaults);
                        locResult.forEach(lr => {
                            lr.isMetadata = builder.producesMetadata;
                            lr.lang = languageTag;
                            lr.partName = `${languageTag}/${lr.partName}`;
                            if (lr.partName.indexOf("vsixlangpack") === -1) {
                                lr.assetType = builder.getType();
                                lr.addressable = true;
                            }
                            else {
                                lr.addressable = false;
                            }
                            const file = this.addFile(lr);
                            if (file.assetType) {
                                this.addAssetToManifest(file.partName, file.assetType, file.addressable, file.lang);
                            }
                        });
                    });
                });
            }
            Object.keys(files).forEach(fileName => {
                let file = files[fileName];
                // Add all assets to manifest except the vsixmanifest (duh)
                if (file.assetType && file.path !== this.getPath()) {
                    this.addAssetToManifest(file.partName, file.assetType, file.addressable, file.lang);
                }
            });
            // Add the manifests as assets.
            builders.forEach(builder => {
                let builderType = builder.getType();
                if (builderType != VsixManifestBuilder.manifestType) {
                    this.addAssetToManifest(builder.getPath(), builder.getType(), true);
                }
            });
            // The vsixmanifest will be responsible for generating the [Content_Types].xml file
            // Obviously this is kind of strange, but hey ho.
            return this.genContentTypesXml(builders).then(result => {
                this.addFile({
                    path: null,
                    content: result,
                    partName: "/[Content_Types].xml",
                });
            });
        });
    }
    /**
     * Gets the string representation (XML) of this manifest
     */
    getResult(resources) {
        return (0, utils_1.jsonToXml)(this.prepResult(resources)).replace(/\n/g, os.EOL);
    }
    /**
     * Generates the required [Content_Types].xml file for the vsix package.
     * This xml contains a <Default> entry for each different file extension
     * found in the package, mapping it to the appropriate MIME type.
     */
    genContentTypesXml(builders) {
        let typeMap = VsixManifestBuilder.CONTENT_TYPE_MAP;
        trace.debug("Generating [Content_Types].xml");
        let contentTypes = {
            Types: {
                $: {
                    xmlns: "http://schemas.openxmlformats.org/package/2006/content-types",
                },
                Default: [],
                Override: [],
            },
        };
        let windows = /^win/.test(process.platform);
        let contentTypePromise;
        const showWarningForExtensionMap = {};
        if (windows) {
            // On windows, check HKCR to get the content type of the file based on the extension
            let contentTypePromises = [];
            let extensionlessFiles = [];
            let uniqueExtensions = _.uniq(Object.keys(this.files).map(f => {
                let extName = path.extname(f) || path.extname(this.files[f].partName);
                const filename = path.basename(f);
                // Look in the best guess table. Or, default to text/plain if the file starts with a "."
                const bestGuess = VsixManifestBuilder.BEST_GUESS_CONTENT_TYPES[filename.toUpperCase()] ||
                    (filename[0] === "." ? "text/plain" : null);
                if (!extName && !this.files[f].contentType && this.files[f].addressable && !bestGuess) {
                    trace.warn("File %s does not have an extension, and its content-type is not declared. Defaulting to application/octet-stream.", path.resolve(f));
                    this.files[f].contentType = "application/octet-stream";
                }
                else if (bestGuess) {
                    this.files[f].contentType = bestGuess;
                }
                if (this.files[f].contentType) {
                    // If there is an override for this file, ignore its extension
                    return "";
                }
                // Later, we will show warnings for extensions with unknown content types if there
                // was at least one file with this extension that was addressable.
                if (!showWarningForExtensionMap[extName] && this.files[f].addressable) {
                    showWarningForExtensionMap[extName] = true;
                }
                return extName.toLowerCase();
            }));
            uniqueExtensions.forEach(ext => {
                if (!ext.trim()) {
                    return;
                }
                if (typeMap[ext]) {
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: ext,
                            ContentType: typeMap[ext],
                        },
                    });
                    return;
                }
                let hkcrKey = new winreg({
                    hive: winreg.HKCR,
                    key: "\\" + ext,
                });
                const regPromise = new Promise((resolve, reject) => {
                    hkcrKey.get("Content Type", (err, result) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(result);
                        }
                    });
                })
                    .then((type) => {
                    trace.debug("Found content type for %s: %s.", ext, type.value);
                    let contentType = "application/octet-stream";
                    if (type) {
                        contentType = type.value;
                    }
                    return contentType;
                })
                    .catch(err => {
                    if (showWarningForExtensionMap[ext]) {
                        trace.warn("Could not determine content type for extension %s. Defaulting to application/octet-stream. To override this, add a contentType property to this file entry in the manifest.", ext);
                    }
                    return "application/octet-stream";
                })
                    .then(contentType => {
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: ext,
                            ContentType: contentType,
                        },
                    });
                });
                contentTypePromises.push(regPromise);
            });
            contentTypePromise = Promise.all(contentTypePromises);
        }
        else {
            // If not on windows, run the file --mime-type command to use magic to get the content type.
            // If the file has an extension, rev a hit counter for that extension and the extension
            // If there is no extension, create an <Override> element for the element
            // For each file with an extension that doesn't match the most common type for that extension
            // (tracked by the hit counter), create an <Override> element.
            // Finally, add a <Default> element for each extension mapped to the most common type.
            let contentTypePromises = [];
            let extTypeCounter = {};
            Object.keys(this.files)
                .filter(fileName => {
                return !this.files[fileName].contentType;
            })
                .forEach(fileName => {
                let extension = path.extname(fileName).toLowerCase();
                let mimePromise;
                if (typeMap[extension]) {
                    if (!extTypeCounter[extension]) {
                        extTypeCounter[extension] = {};
                    }
                    if (!extTypeCounter[extension][typeMap[extension]]) {
                        extTypeCounter[extension][typeMap[extension]] = [];
                    }
                    extTypeCounter[extension][typeMap[extension]].push(fileName);
                    mimePromise = Promise.resolve(null);
                    return;
                }
                mimePromise = new Promise((resolve, reject) => {
                    let child = childProcess.exec('file --mime-type "' + fileName + '"', (err, stdout, stderr) => {
                        try {
                            if (err) {
                                if (this.files[fileName].addressable) {
                                    reject(err);
                                }
                                else {
                                    this.files[fileName].contentType = "application/octet-stream";
                                }
                            }
                            else {
                                if (typeof stdout === "string") {
                                    let magicMime = _.trimEnd(stdout.substr(stdout.lastIndexOf(" ") + 1), "\n");
                                    trace.debug("Magic mime type for %s is %s.", fileName, magicMime);
                                    if (magicMime) {
                                        if (extension) {
                                            if (!extTypeCounter[extension]) {
                                                extTypeCounter[extension] = {};
                                            }
                                            let hitCounters = extTypeCounter[extension];
                                            if (!hitCounters[magicMime]) {
                                                hitCounters[magicMime] = [];
                                            }
                                            hitCounters[magicMime].push(fileName);
                                        }
                                        else {
                                            if (!this.files[fileName].contentType) {
                                                this.files[fileName].contentType = magicMime;
                                            }
                                        }
                                    }
                                    else {
                                        if (stderr) {
                                            if (this.files[fileName].addressable) {
                                                reject(stderr);
                                            }
                                            else {
                                                this.files[fileName].contentType = "application/octet-stream";
                                            }
                                        }
                                        else {
                                            if (this.files[fileName].addressable) {
                                                trace.warn("Could not determine content type for %s. Defaulting to application/octet-stream. To override this, add a contentType property to this file entry in the manifest.", fileName);
                                            }
                                            this.files[fileName].contentType = "application/octet-stream";
                                        }
                                    }
                                }
                            }
                            resolve(null);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
                contentTypePromises.push(mimePromise);
            });
            contentTypePromise = Promise.all(contentTypePromises).then(() => {
                Object.keys(extTypeCounter).forEach(ext => {
                    let hitCounts = extTypeCounter[ext];
                    let bestMatch = (0, utils_1.maxKey)(hitCounts, i => i.length);
                    Object.keys(hitCounts).forEach(type => {
                        if (type === bestMatch) {
                            return;
                        }
                        hitCounts[type].forEach(fileName => {
                            this.files[fileName].contentType = type;
                        });
                    });
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: ext,
                            ContentType: bestMatch,
                        },
                    });
                });
            });
        }
        return contentTypePromise.then(() => {
            let seenPartNames = new Set();
            Object.keys(this.files).forEach(filePath => {
                if (this.files[filePath].contentType) {
                    let partName = "/" + (0, utils_1.toZipItemName)(this.files[filePath].partName);
                    if (!seenPartNames.has(partName)) {
                        contentTypes.Types.Override.push({
                            $: {
                                ContentType: this.files[filePath].contentType,
                                PartName: partName,
                            },
                        });
                        seenPartNames.add(partName);
                    }
                    if (this.files[filePath]._additionalPackagePaths) {
                        for (const additionalPath of this.files[filePath]._additionalPackagePaths) {
                            let additionalPartName = "/" + (0, utils_1.toZipItemName)(additionalPath);
                            if (!seenPartNames.has(additionalPartName)) {
                                contentTypes.Types.Override.push({
                                    $: {
                                        ContentType: this.files[filePath].contentType,
                                        PartName: additionalPartName,
                                    },
                                });
                                seenPartNames.add(additionalPartName);
                            }
                        }
                    }
                }
            });
            // Add the Default entries for manifests.
            builders.forEach(builder => {
                let manifestExt = path.extname(builder.getPath());
                if (contentTypes.Types.Default.filter(t => t.$.Extension === manifestExt).length === 0) {
                    contentTypes.Types.Default.push({
                        $: {
                            Extension: manifestExt,
                            ContentType: builder.getContentType(),
                        },
                    });
                }
            });
            return (0, utils_1.jsonToXml)(contentTypes).replace(/\n/g, os.EOL);
        });
    }
}
exports.VsixManifestBuilder = VsixManifestBuilder;
/**
 * List of known file types to use in the [Content_Types].xml file in the VSIX package.
 */
VsixManifestBuilder.CONTENT_TYPE_MAP = {
    ".bat": "application/bat",
    ".css": "text/css",
    ".eot": "application/vnd.ms-fontobject",
    ".gif": "image/gif",
    ".hbs": "text/x-handlebars-template",
    ".html": "text/html",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "application/javascript",
    ".json": "application/json",
    ".map": "application/json",
    ".md": "text/markdown",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".ps1": "text/ps1",
    ".scss": "text/plain",
    ".svg": "image/svg+xml",
    ".ts": "text/plain",
    ".vsixlangpack": "text/xml",
    ".vsixmanifest": "text/xml",
    ".vsomanifest": "application/json",
    ".woff": "application/font-woff",
};
VsixManifestBuilder.BEST_GUESS_CONTENT_TYPES = {
    README: "text/plain",
    LICENSE: "text/plain",
    AUTHORS: "text/plain",
};
VsixManifestBuilder.manifestType = "vsix";
//# sourceMappingURL=vsix-manifest-builder.js.map