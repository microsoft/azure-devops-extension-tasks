"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_XML_BUILDER_SETTINGS = exports.maxKey = exports.jsonToXml = exports.toZipItemName = exports.forwardSlashesPath = exports.cleanAssetPath = exports.removeMetaKeys = void 0;
const _ = require("lodash");
const os = require("os");
const path = require("path");
const xml = require("xml2js");
function removeMetaKeys(obj) {
    return _.omitBy(obj, (v, k) => _.startsWith(k, "__meta_"));
}
exports.removeMetaKeys = removeMetaKeys;
function cleanAssetPath(assetPath, root = ".") {
    if (!assetPath) {
        return null;
    }
    return forwardSlashesPath(path.resolve(root, assetPath));
}
exports.cleanAssetPath = cleanAssetPath;
function forwardSlashesPath(filePath) {
    if (!filePath) {
        return null;
    }
    let cleanPath = filePath.replace(/\\/g, "/");
    return cleanPath;
}
exports.forwardSlashesPath = forwardSlashesPath;
/**
 * OPC Convention implementation. See
 * http://www.ecma-international.org/news/TC45_current_work/tc45-2006-335.pdf §10.1.3.2 & §10.2.3
 */
function toZipItemName(partName) {
    if (_.startsWith(partName, "/")) {
        return partName.substr(1);
    }
    else {
        return partName;
    }
}
exports.toZipItemName = toZipItemName;
function jsonToXml(json) {
    let builder = new xml.Builder(exports.DEFAULT_XML_BUILDER_SETTINGS);
    return builder.buildObject(json);
}
exports.jsonToXml = jsonToXml;
function maxKey(obj, func) {
    let maxProp;
    for (let prop in obj) {
        if (!maxProp || func(obj[prop]) > func(obj[maxProp])) {
            maxProp = prop;
        }
    }
    return maxProp;
}
exports.maxKey = maxKey;
exports.DEFAULT_XML_BUILDER_SETTINGS = {
    indent: "    ",
    newline: os.EOL,
    pretty: true,
    xmldec: {
        encoding: "utf-8",
        standalone: null,
        version: "1.0",
    },
};
//# sourceMappingURL=utils.js.map