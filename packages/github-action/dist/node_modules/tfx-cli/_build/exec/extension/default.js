"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionBase = exports.ManifestJsonArgument = exports.getCommand = void 0;
const tfcommand_1 = require("../../lib/tfcommand");
const publish_1 = require("./_lib/publish");
const path = __importStar(require("path"));
const _ = require("lodash");
const jju = require("jju");
const args = require("../../lib/arguments");
const https = require("https");
const trace = require("../../lib/trace");
const fs_1 = require("fs");
const util_1 = require("util");
const GalleryApi_1 = require("azure-devops-node-api/GalleryApi");
function getCommand(args) {
    return new ExtensionBase(args);
}
exports.getCommand = getCommand;
class ManifestJsonArgument extends args.JsonArgument {
}
exports.ManifestJsonArgument = ManifestJsonArgument;
class ExtensionBase extends tfcommand_1.TfCommand {
    constructor(passedArgs) {
        super(passedArgs);
        this.description = "Commands to package, publish, and manage Extensions for Azure DevOps Services.";
        this.serverCommand = false;
    }
    getHelpArgs() {
        return [];
    }
    setCommandArgs() {
        super.setCommandArgs();
        this.registerCommandArgument("extensionId", "Extension ID", "Use this as the extension ID instead of what is specified in the manifest.", args.StringArgument);
        this.registerCommandArgument("publisher", "Publisher name", "Use this as the publisher ID instead of what is specified in the manifest.", args.StringArgument);
        this.registerCommandArgument("manifestJs", "Manifest JS file", "A manifest in the form of a JS file with an exported function that can be called by node and will return the manifest JSON object.", args.ReadableFilePathsArgument, null);
        this.registerCommandArgument("env", "Manifest JS environment", "Environment variables passed to the Manifest JS function.", args.ArrayArgument, null);
        this.registerCommandArgument("manifests", "Manifests", "List of individual manifest files (space separated).", args.ArrayArgument, "vss-extension.json");
        this.registerCommandArgument("manifestGlobs", "Manifest globs", "List of globs to find manifests (space separated).", args.ArrayArgument, null);
        this.registerCommandArgument("json5", "Extended JSON", "Support extended JSON (aka JSON 5) for comments, unquoted strings, dangling commas, etc.", args.BooleanArgument, "false");
        this.registerCommandArgument("outputPath", "Output path", "Path to write the VSIX.", args.StringArgument, "{auto}");
        this.registerCommandArgument("override", "Overrides JSON", "JSON string which is merged into the manifests, overriding any values.", ManifestJsonArgument, "{}");
        this.registerCommandArgument("overridesFile", "Overrides JSON file", "Path to a JSON file with overrides. This partial manifest will always take precedence over any values in the manifests.", args.ReadableFilePathsArgument, null);
        this.registerCommandArgument("shareWith", "Share with", "List of Azure DevOps organization(s) with which to share the extension (space separated).", args.ArrayArgument, null);
        this.registerCommandArgument("unshareWith", "Un-share with", "List of Azure DevOps organization(s) with which to un-share the extension (space separated).", args.ArrayArgument, null);
        this.registerCommandArgument("vsix", "VSIX path", "Path to an existing VSIX (to publish or query for).", args.ReadableFilePathsArgument);
        this.registerCommandArgument("bypassScopeCheck", "Bypass scope check", null, args.BooleanArgument, "false");
        this.registerCommandArgument("bypassValidation", "Bypass local validation", null, args.BooleanArgument, "false");
        this.registerCommandArgument("locRoot", "Localization root", "Root of localization hierarchy (see README for more info).", args.ExistingDirectoriesArgument, null);
        this.registerCommandArgument("displayName", "Display name", null, args.StringArgument);
        this.registerCommandArgument("description", "Description", "Description of the Publisher.", args.StringArgument);
        this.registerCommandArgument("revVersion", "Rev version", "Rev the patch-version of the extension and save the result.", args.BooleanArgument, "false");
        this.registerCommandArgument("noWaitValidation", "Wait for validation?", "Don't block command for extension validation.", args.BooleanArgument, "false");
        this.registerCommandArgument("metadataOnly", "Metadata only", "Only copy metadata to the path specified and do not package the extension", args.BooleanArgument, "false", true);
    }
    getMergeSettings() {
        return Promise.all([
            this.commandArgs.root.val(),
            this.commandArgs.locRoot.val(),
            this.commandArgs.manifestJs.val().then(files => files && files.length ? files[0] : null),
            this.commandArgs.env.val(),
            this.commandArgs.manifests.val(),
            this.commandArgs.manifestGlobs.val(),
            this.commandArgs.override.val(),
            this.commandArgs.overridesFile.val(),
            this.commandArgs.revVersion.val(),
            this.commandArgs.bypassValidation.val(),
            this.commandArgs.publisher.val(true),
            this.commandArgs.extensionId.val(true),
            this.commandArgs.json5.val(true),
        ]).then(values => {
            const [root, locRoot, manifestJs, env, manifests, manifestGlob, override, overridesFile, revVersion, bypassValidation, publisher, extensionId, json5,] = values;
            if (publisher) {
                _.set(override, "publisher", publisher);
            }
            if (extensionId) {
                _.set(override, "extensionid", extensionId);
            }
            let overrideFileContent = Promise.resolve("");
            if (overridesFile && overridesFile.length > 0) {
                overrideFileContent = (0, util_1.promisify)(fs_1.readFile)(overridesFile[0], "utf8");
            }
            return overrideFileContent.then(contentStr => {
                let content = contentStr;
                if (content === "") {
                    content = "{}";
                    if (overridesFile && overridesFile.length > 0) {
                        trace.warn("Overrides file was empty. No overrides will be imported from " + overridesFile[0]);
                    }
                }
                let mergedOverrides = {};
                let contentJSON = {};
                try {
                    contentJSON = json5 ? jju.parse(content) : JSON.parse(content);
                }
                catch (e) {
                    throw new Error("Could not parse contents of " + overridesFile[0] + " as JSON. \n");
                }
                contentJSON["__origin"] = overridesFile ? overridesFile[0] : path.join(root[0], "_override.json");
                _.merge(mergedOverrides, contentJSON, override);
                return {
                    root: root[0],
                    locRoot: locRoot && locRoot[0],
                    manifestJs: manifestJs,
                    env: env,
                    manifests: manifests,
                    manifestGlobs: manifestGlob,
                    overrides: mergedOverrides,
                    bypassValidation: bypassValidation,
                    revVersion: revVersion,
                    json5: json5,
                };
            });
        });
    }
    getPackageSettings() {
        return Promise.all([
            this.commandArgs.outputPath.val(),
            this.commandArgs.locRoot.val(),
            this.commandArgs.metadataOnly.val(),
        ]).then(values => {
            const [outputPath, locRoot, metadataOnly] = values;
            return {
                outputPath: outputPath,
                locRoot: locRoot && locRoot[0],
                metadataOnly: metadataOnly,
            };
        });
    }
    identifyExtension() {
        return this.commandArgs.vsix.val(true).then(result => {
            let vsixPath = _.isArray(result) ? result[0] : null;
            let infoPromise;
            if (!vsixPath) {
                infoPromise = Promise.all([this.commandArgs.publisher.val(), this.commandArgs.extensionId.val()]).then(values => {
                    const [publisher, extensionId] = values;
                    return publish_1.GalleryBase.getExtInfo({ extensionId: extensionId, publisher: publisher });
                });
            }
            else {
                infoPromise = Promise.all([this.commandArgs.publisher.val(true), this.commandArgs.extensionId.val(true)]).then(values => {
                    const [publisher, extensionId] = values;
                    return publish_1.GalleryBase.getExtInfo({ vsixPath: vsixPath, publisher: publisher, extensionId: extensionId });
                });
            }
            return infoPromise;
        });
    }
    getPublishSettings() {
        return Promise.all([
            this.commandArgs.serviceUrl.val(),
            this.commandArgs.vsix.val(true),
            this.commandArgs.publisher.val(true),
            this.commandArgs.extensionId.val(true),
            this.commandArgs.shareWith.val(),
            this.commandArgs.noWaitValidation.val(),
            this.commandArgs.bypassScopeCheck.val(),
        ]).then(values => {
            const [marketUrl, vsix, publisher, extensionId, shareWith, noWaitValidation, bypassScopeCheck] = values;
            let vsixPath = _.isArray(vsix) ? vsix[0] : null;
            return {
                galleryUrl: marketUrl,
                vsixPath: vsixPath,
                publisher: publisher,
                extensionId: extensionId,
                shareWith: shareWith,
                noWaitValidation: noWaitValidation,
                bypassScopeCheck: bypassScopeCheck,
            };
        });
    }
    exec(cmd) {
        return this.getHelp(cmd);
    }
    /**** TEMPORARY until Marketplace fixes getResourceArea ****/
    async getGalleryApi() {
        const handler = await this.getCredentials(this.webApi.serverUrl, false);
        return new GalleryApi_1.GalleryApi(this.webApi.serverUrl, [handler]); // await this.webApi.getGalleryApi(this.webApi.serverUrl);
    }
    /**** TEMPORARY until Marketplace fixes getResourceArea ****/
    static async getMarketplaceUrl() {
        trace.debug("getMarketplaceUrl");
        const url = "https://app.vssps.visualstudio.com/_apis/resourceareas/69D21C00-F135-441B-B5CE-3626378E0819";
        const response = await new Promise((resolve, reject) => {
            https
                .get(url, resp => {
                let data = "";
                resp.on("data", chunk => {
                    data += chunk;
                });
                resp.on("end", () => {
                    resolve(data);
                });
            })
                .on("error", err => {
                reject(err);
            });
        });
        const resourceArea = JSON.parse(response);
        return [resourceArea["locationUrl"]];
    }
}
exports.ExtensionBase = ExtensionBase;
//# sourceMappingURL=default.js.map