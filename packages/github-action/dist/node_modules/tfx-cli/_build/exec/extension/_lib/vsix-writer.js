"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VsixWriter = void 0;
const vsix_manifest_builder_1 = require("./vsix-manifest-builder");
const utils_1 = require("./utils");
const loc_1 = require("./loc");
const _ = require("lodash");
const mkdirp = require("mkdirp");
const os = require("os");
const path = require("path");
const trace = require("../../../lib/trace");
const zip = require("jszip");
const promiseUtils_1 = require("../../../lib/promiseUtils");
const fs_1 = require("fs");
const util_1 = require("util");
const fsUtils_1 = require("../../../lib/fsUtils");
/**
 * Facilitates packaging the vsix and writing it to a file
 */
class VsixWriter {
    /**
     * constructor
     * @param any vsoManifest JS Object representing a vso manifest
     * @param any vsixManifest JS Object representing the XML for a vsix manifest
     */
    constructor(settings, components) {
        this.settings = settings;
        this.manifestBuilders = components.builders;
        this.resources = components.resources;
    }
    /**
     * If outPath is {auto}, generate an automatic file name.
     * Otherwise, try to determine if outPath is a directory (checking for a . in the filename)
     * If it is, generate an automatic filename in the given outpath
     * Otherwise, outPath doesn't change.
     * If filename is generated automatically, use fileExt as the extension
     */
    getOutputPath(outPath, fileExt = "vsix") {
        // Find the vsix manifest, if it exists
        let vsixBuilders = this.manifestBuilders.filter(b => b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType);
        let autoName = "extension." + fileExt;
        if (vsixBuilders.length === 1) {
            let vsixManifest = vsixBuilders[0].getData();
            let pub = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Publisher");
            let ns = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Id");
            let version = _.get(vsixManifest, "PackageManifest.Metadata[0].Identity[0].$.Version");
            autoName = `${pub}.${ns}-${version}.${fileExt}`;
        }
        if (outPath === "{auto}") {
            return path.resolve(autoName);
        }
        else {
            let basename = path.basename(outPath);
            if (basename.indexOf(".") > 0) {
                // conscious use of >
                return path.resolve(outPath);
            }
            else {
                return path.resolve(path.join(outPath, autoName));
            }
        }
    }
    static validatePartName(partName) {
        let segments = partName.split("/");
        if (segments.length === 1 && segments[0] === "[Content_Types].xml") {
            return true;
        }
        // matches most invalid segments.
        let re = /(%2f)|(%5c)|(^$)|(%[^0-9a-f])|(%.[^0-9a-f])|(\.$)|([^a-z0-9._~%!$&'()*+,;=:@-])/i;
        return segments.filter(segment => re.test(segment)).length === 0;
    }
    async writeVsixMetadata() {
        let prevWrittenOutput = null;
        const outputPath = this.settings.outputPath;
        for (const builder of this.manifestBuilders) {
            const metadataResult = builder.getMetadataResult(this.resources.combined);
            if (typeof metadataResult === "string") {
                if (prevWrittenOutput === outputPath) {
                    trace.warn("Warning: Multiple files written to " +
                        outputPath +
                        ". Last writer will win. Instead, try providing a folder path in --output-path.");
                }
                const writePath = path.join(outputPath, builder.getPath());
                await (0, util_1.promisify)(fs_1.writeFile)(writePath, metadataResult, "utf8");
                prevWrittenOutput = outputPath;
            }
        }
        return outputPath;
    }
    /**
     * Write a vsix package to the given file name
     */
    async writeVsix() {
        if (this.settings.metadataOnly) {
            const outputPath = this.settings.outputPath;
            const pathExists = await (0, fsUtils_1.exists)(outputPath);
            if (pathExists && !(await (0, util_1.promisify)(fs_1.lstat)(outputPath)).isDirectory()) {
                throw new Error("--output-path must be a directory when using --metadata-only.");
            }
            if (!pathExists) {
                await mkdirp(outputPath);
            }
            for (const builder of this.manifestBuilders) {
                for (const filePath of Object.keys(builder.files)) {
                    const fileObj = builder.files[filePath];
                    if (fileObj.isMetadata) {
                        const content = fileObj.content || (await (0, util_1.promisify)(fs_1.readFile)(fileObj.path, "utf-8"));
                        const writePath = path.join(this.settings.outputPath, fileObj.partName);
                        const folder = path.dirname(writePath);
                        await mkdirp(folder);
                        await (0, util_1.promisify)(fs_1.writeFile)(writePath, content, "utf-8");
                    }
                }
            }
            return this.writeVsixMetadata();
        }
        let outputPath = this.getOutputPath(this.settings.outputPath);
        let vsix = new zip();
        let builderPromises = [];
        let seenPartNames = new Set();
        this.manifestBuilders.forEach(builder => {
            // Avoid the error EMFILE: too many open files
            const addPackageFilesBatch = (paths, numBatch, batchSize, deferred) => {
                deferred = deferred || (0, promiseUtils_1.defer)();
                let readFilePromises = [];
                const start = numBatch * batchSize;
                const end = Math.min(paths.length, start + batchSize);
                for (let i = start; i < end; i++) {
                    const path = paths[i];
                    let itemName = (0, utils_1.toZipItemName)(builder.files[path].partName);
                    if (!VsixWriter.validatePartName(itemName)) {
                        let eol = require("os").EOL;
                        throw new Error("Part Name '" +
                            itemName +
                            "' is invalid. Please check the following: " +
                            eol +
                            "1. No whitespace or any of these characters: #^[]<>?" +
                            eol +
                            "2. Cannot end with a period." +
                            eol +
                            "3. No percent-encoded / or \\ characters. Additionally, % must be followed by two hex characters.");
                    }
                    if (itemName.indexOf(" "))
                        if (!builder.files[path].content) {
                            let readFilePromise = (0, util_1.promisify)(fs_1.readFile)(path).then(result => {
                                if (!seenPartNames.has(itemName)) {
                                    vsix.file(itemName, result);
                                    seenPartNames.add(itemName);
                                }
                                if (builder.files[path]._additionalPackagePaths) {
                                    for (const p of builder.files[path]._additionalPackagePaths) {
                                        let additionalItemName = (0, utils_1.toZipItemName)(p);
                                        if (!seenPartNames.has(additionalItemName)) {
                                            vsix.file(additionalItemName, result);
                                            seenPartNames.add(additionalItemName);
                                        }
                                    }
                                }
                            });
                            readFilePromises.push(readFilePromise);
                        }
                        else {
                            if (!seenPartNames.has(itemName)) {
                                vsix.file(itemName, builder.files[path].content);
                                seenPartNames.add(itemName);
                            }
                            if (builder.files[path]._additionalPackagePaths) {
                                for (const p of builder.files[path]._additionalPackagePaths) {
                                    let additionalItemName = (0, utils_1.toZipItemName)(p);
                                    if (!seenPartNames.has(additionalItemName)) {
                                        vsix.file(additionalItemName, builder.files[path].content);
                                        seenPartNames.add(additionalItemName);
                                    }
                                }
                            }
                            readFilePromises.push(Promise.resolve(null));
                        }
                }
                Promise.all(readFilePromises)
                    .then(function () {
                    if (end < paths.length) {
                        // Next batch
                        addPackageFilesBatch(paths, numBatch + 1, batchSize, deferred);
                    }
                    else {
                        deferred.resolve(null);
                    }
                })
                    .catch(function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            // Add the package files in batches
            let builderPromise = addPackageFilesBatch(Object.keys(builder.files), 0, VsixWriter.VSIX_ADD_FILES_BATCH_SIZE).then(() => {
                // Add the manifest itself
                vsix.file((0, utils_1.toZipItemName)(builder.getPath()), builder.getResult(this.resources.combined));
            });
            builderPromises.push(builderPromise);
        });
        return Promise.all(builderPromises).then(() => {
            trace.debug("Writing vsix to: %s", outputPath);
            return mkdirp(path.dirname(outputPath)).then(async () => {
                let buffer = await vsix.generateAsync({
                    type: "nodebuffer",
                    compression: "DEFLATE",
                });
                return (0, util_1.promisify)(fs_1.writeFile)(outputPath, buffer).then(() => outputPath);
            });
        });
    }
    /**
     * For each folder F under the localization folder (--loc-root),
     * look for a resources.resjson file within F. If it exists, split the
     * resources.resjson into one file per manifest. Add
     * each to the vsix archive as F/<manifest_loc_path> and F/Extension.vsixlangpack
     */
    addResourceStrings(vsix) {
        // Make sure locRoot is set, that it refers to a directory, and
        // iterate each subdirectory of that.
        if (!this.settings.locRoot) {
            return Promise.resolve(null);
        }
        let stringsPath = path.resolve(this.settings.locRoot);
        // Check that --loc-root exists and is a directory.
        return (0, fsUtils_1.exists)(stringsPath)
            .then(exists => {
            if (exists) {
                return (0, util_1.promisify)(fs_1.lstat)(stringsPath).then(stats => {
                    if (stats.isDirectory()) {
                        return true;
                    }
                });
            }
            else {
                return false;
            }
        })
            .then(stringsFolderExists => {
            if (!stringsFolderExists) {
                return Promise.resolve(null);
            }
            // stringsPath exists and is a directory - read it.
            return (0, util_1.promisify)(fs_1.readdir)(stringsPath).then((files) => {
                let promises = [];
                files.forEach(languageTag => {
                    var filePath = path.join(stringsPath, languageTag);
                    let promise = (0, util_1.promisify)(fs_1.lstat)(filePath).then(fileStats => {
                        if (fileStats.isDirectory()) {
                            // We're under a language tag directory within locRoot. Look for
                            // resources.resjson and use that to generate manfiest files
                            let resourcePath = path.join(filePath, "resources.resjson");
                            (0, fsUtils_1.exists)(resourcePath).then(exists => {
                                if (exists) {
                                    // A resources.resjson file exists in <locRoot>/<language_tag>/
                                    return (0, util_1.promisify)(fs_1.readFile)(resourcePath, "utf8").then(contents => {
                                        let resourcesObj = JSON.parse(contents);
                                        // For each language, go through each builder and generate its
                                        // localized resources.
                                        this.manifestBuilders.forEach(builder => {
                                            const locFiles = builder.getLocResult(resourcesObj, null);
                                            locFiles.forEach(locFile => { });
                                        });
                                        let locGen = new loc_1.LocPrep.LocKeyGenerator(null);
                                        // let splitRes = locGen.splitIntoVsoAndVsixResourceObjs(resourcesObj);
                                        // let locManifestPath = languageTag + "/" + VsixWriter.VSO_MANIFEST_FILENAME;
                                        // vsix.file(toZipItemName(locManifestPath), this.getVsoManifestString(splitRes.vsoResources));
                                        // this.vsixManifest.PackageManifest.Assets[0].Asset.push({
                                        // 	"$": {
                                        // 		Lang: languageTag,
                                        // 		Type: "Microsoft.VisualStudio.Services.Manifest",
                                        // 		Path: locManifestPath,
                                        // 		Addressable: "true",
                                        // 		"d:Source": "File"
                                        // 	}
                                        // });
                                        // let builder = new xml.Builder(VsixWriter.DEFAULT_XML_BUILDER_SETTINGS);
                                        // let vsixLangPackStr = builder.buildObject(splitRes.vsixResources);
                                        // vsix.file(toZipItemName(languageTag + "/Extension.vsixlangpack"), vsixLangPackStr);
                                    });
                                }
                                else {
                                    return Promise.resolve(null);
                                }
                            });
                        }
                    });
                    promises.push(promise);
                });
                return Promise.all(promises);
            });
        });
    }
}
exports.VsixWriter = VsixWriter;
VsixWriter.VSIX_ADD_FILES_BATCH_SIZE = 20;
VsixWriter.VSO_MANIFEST_FILENAME = "extension.vsomanifest";
VsixWriter.VSIX_MANIFEST_FILENAME = "extension.vsixmanifest";
VsixWriter.CONTENT_TYPES_FILENAME = "[Content_Types].xml";
VsixWriter.DEFAULT_XML_BUILDER_SETTINGS = {
    indent: "    ",
    newline: os.EOL,
    pretty: true,
    xmldec: {
        encoding: "utf-8",
        standalone: null,
        version: "1.0",
    },
};
//# sourceMappingURL=vsix-writer.js.map