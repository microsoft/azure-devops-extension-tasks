"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocPrep = void 0;
const vsix_manifest_builder_1 = require("./vsix-manifest-builder");
const _ = require("lodash");
const trace = require("../../../lib/trace");
const mkdirp = require("mkdirp");
const path = require("path");
const util_1 = require("util");
const fs_1 = require("fs");
const fsUtils_1 = require("../../../lib/fsUtils");
var LocPrep;
(function (LocPrep) {
    /**
     * Creates a deep copy of document, replacing resource keys with the values from
     * the resources object.
     * If a resource cannot be found, the same string from the defaults document will be substituted.
     * The defaults object must have the same structure/schema as document.
     */
    function makeReplacements(document, resources, defaults) {
        let locDocument = _.isArray(document) ? [] : {};
        for (let key in document) {
            if (propertyIsComment(key)) {
                continue;
            }
            else if (_.isObject(document[key])) {
                locDocument[key] = makeReplacements(document[key], resources, defaults);
            }
            else if (_.isString(document[key]) && _.startsWith(document[key], "resource:")) {
                let resourceKey = document[key].substr("resource:".length).trim();
                let replacement = resources[resourceKey];
                if (!_.isString(replacement)) {
                    replacement = defaults[resourceKey];
                    trace.warn("Could not find a replacement for resource key %s. Falling back to '%s'.", resourceKey, replacement);
                }
                locDocument[key] = replacement;
            }
            else {
                locDocument[key] = document[key];
            }
        }
        return locDocument;
    }
    LocPrep.makeReplacements = makeReplacements;
    /**
     * If the resjsonPath setting is set...
     * Check if the path exists. If it does, check if it's a directory.
     * If it's a directory, write to path + extension.resjson
     * All other cases just write to path.
     */
    function writeResourceFile(fullResjsonPath, resources) {
        return (0, fsUtils_1.exists)(fullResjsonPath)
            .then(exists => {
            if (exists) {
                return (0, util_1.promisify)(fs_1.lstat)(fullResjsonPath)
                    .then(obj => {
                    return obj.isDirectory();
                })
                    .then(isDir => {
                    if (isDir) {
                        return path.join(fullResjsonPath, "extension.resjson");
                    }
                    else {
                        return fullResjsonPath;
                    }
                });
            }
            else {
                return fullResjsonPath;
            }
        })
            .then(determinedPath => {
            return mkdirp(path.dirname(determinedPath)).then(() => {
                return (0, util_1.promisify)(fs_1.writeFile)(determinedPath, JSON.stringify(resources, null, 4), "utf8");
            });
        });
    }
    LocPrep.writeResourceFile = writeResourceFile;
    function propertyIsComment(property) {
        return _.startsWith(property, "_") && _.endsWith(property, ".comment");
    }
    LocPrep.propertyIsComment = propertyIsComment;
    class LocKeyGenerator {
        constructor(manifestBuilders) {
            this.manifestBuilders = manifestBuilders;
            this.initStringObjs();
            // find the vsixmanifest and pull it out because we treat it a bit differently
            let vsixManifest = manifestBuilders.filter(b => b.getType() === vsix_manifest_builder_1.VsixManifestBuilder.manifestType);
            if (vsixManifest.length === 1) {
                this.vsixManifestBuilder = vsixManifest[0];
            }
            else {
                throw "Found " + vsixManifest.length + " vsix manifest builders (expected 1). Something is not right!";
            }
        }
        initStringObjs() {
            this.resourceFileMap = {};
            this.manifestBuilders.forEach(b => {
                this.resourceFileMap[b.getType()] = {};
            });
            this.combined = {};
        }
        /**
         * Destructive method modifies the manifests by replacing i18nable strings with resource:
         * keys. Adds all the original resources to the resources object.
         */
        generateLocalizationKeys() {
            this.initStringObjs();
            this.manifestBuilders.forEach(builder => {
                this.jsonReplaceWithKeysAndGenerateDefaultStrings(builder);
            });
            return {
                manifestResources: this.resourceFileMap,
                combined: this.generateCombinedResourceFile(),
            };
        }
        generateCombinedResourceFile() {
            let combined = {};
            let resValues = Object.keys(this.resourceFileMap).map(k => this.resourceFileMap[k]);
            // the .d.ts file falls short in this case
            let anyAssign = _.assign;
            anyAssign(combined, ...resValues);
            return combined;
        }
        addResource(builderType, sourceKey, resourceKey, obj) {
            let resourceVal = this.removeI18nPrefix(obj[sourceKey]);
            this.resourceFileMap[builderType][resourceKey] = resourceVal;
            let comment = obj["_" + sourceKey + ".comment"];
            if (comment) {
                this.resourceFileMap[builderType]["_" + resourceKey + ".comment"] = comment;
            }
            obj[sourceKey] = "resource:" + resourceKey;
        }
        removeI18nPrefix(str) {
            if (_.startsWith(str, LocKeyGenerator.I18N_PREFIX)) {
                return str.substr(LocKeyGenerator.I18N_PREFIX.length);
            }
            return str;
        }
        jsonReplaceWithKeysAndGenerateDefaultStrings(builder, json = null, path = "") {
            if (!json) {
                json = builder.getData();
            }
            for (let key in json) {
                let val = json[key];
                if (_.isObject(val)) {
                    let nextPath = path + key + ".";
                    this.jsonReplaceWithKeysAndGenerateDefaultStrings(builder, val, nextPath);
                }
                else if (_.isString(val) && _.startsWith(val, LocKeyGenerator.I18N_PREFIX)) {
                    this.addResource(builder.getType(), key, builder.getLocKeyPath(path + key), json);
                }
            }
        }
    }
    LocKeyGenerator.I18N_PREFIX = "i18n:";
    LocPrep.LocKeyGenerator = LocKeyGenerator;
})(LocPrep = exports.LocPrep || (exports.LocPrep = {}));
//# sourceMappingURL=loc.js.map