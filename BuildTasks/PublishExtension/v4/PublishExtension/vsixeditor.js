"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSIXEditor = void 0;
require("core-js");
const temp = require("temp");
const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");
const Q = require("q");
const tl = require("azure-pipelines-task-lib/task");
const tr = require("azure-pipelines-task-lib/toolrunner");
const common = require("../Common/Common");
class ManifestData {
    constructor(version, id, publisher, visibility, pricing, name, dirPath) {
        this.version = version;
        this.id = id;
        this.publisher = publisher;
        this.visibility = visibility;
        this.pricing = pricing;
        this.name = name;
        this.dirPath = dirPath;
    }
    createOutputFilePath(outputPath) {
        const fileName = `${this.publisher}.${this.id}-${this.version}.gen.vsix`;
        const updateFileName = (fileName, iteration) => {
            if (iteration > 0) {
                const gen = iteration.toString().padStart(2, "0");
                fileName = `${this.publisher}.${this.id}-${this.version}.gen${gen}.vsix`;
            }
            fs.exists(path.join(outputPath, fileName), result => {
                if (result) {
                    updateFileName(fileName, ++iteration);
                }
                else {
                    tl.debug("Generated filename: " + fileName);
                }
            });
        };
        updateFileName(fileName, 0);
        return fileName;
    }
}
class GalleryFlagsEditor {
    constructor(galleryFlagsEditor) {
        this.flags = [];
        if (galleryFlagsEditor) {
            this.flags = galleryFlagsEditor.split(" ").filter(f => f != null && f !== "");
        }
    }
    addFlag(flag) {
        if (this.flags.indexOf(flag) < 0) {
            this.flags.push(flag);
        }
    }
    removeFlag(flag) {
        const index = this.flags.indexOf(flag);
        if (index >= 0) {
            this.flags.splice(index, 1);
        }
    }
    addPublicFlag() {
        this.addFlag("Public");
    }
    removePublicFlag() {
        this.removeFlag("Public");
    }
    removePaidFlag() {
        this.removeFlag("Paid");
    }
    addPaidFlag() {
        this.addFlag("Paid");
    }
    addPreviewFlag() {
        this.addFlag("Preview");
    }
    removePreviewFlag() {
        this.removeFlag("Preview");
    }
    toString() {
        return this.flags.join(" ");
    }
}
class VSIXEditor {
    constructor(inputFile, outputPath) {
        this.inputFile = inputFile;
        this.outputPath = outputPath;
        this.edit = false;
        this.versionNumber = null;
        this.id = null;
        this.idTag = null;
        this.publisher = null;
        this.extensionName = null;
        this.extensionVisibility = null;
        this.extensionPricing = null;
        this.updateTasksVersion = true;
        this.updateTasksId = true;
    }
    startEdit() {
        if (this.edit) {
            throw new Error("Edit is already started");
        }
        this.edit = true;
        tl.debug("Editing started");
    }
    extractArchive(input, output) {
        if (tl.osType() === "Windows_NT") {
            const sevenZip = require("7zip-bin-win");
            const zip = new tr.ToolRunner(sevenZip.path7za);
            zip.arg("x");
            zip.arg(input);
            zip.arg(`-o${output}`);
            zip.arg("-y");
            zip.arg("-spd");
            zip.arg("-aoa");
            zip.execSync();
        }
        else {
            const zip = new tr.ToolRunner(tl.which("unzip", true));
            zip.arg("-o");
            zip.arg("-d");
            zip.arg(output);
            zip.arg(input);
            zip.execSync();
        }
    }
    createArchive(input, output) {
        if (tl.osType() === "Windows_NT") {
            const sevenZip = require("7zip-bin-win");
            const zip = new tr.ToolRunner(sevenZip.path7za);
            zip.arg("a");
            zip.arg(output);
            zip.arg(path.join(input, "\\*"));
            zip.arg("-r");
            zip.arg("-y");
            zip.arg("-tzip");
            zip.arg("-mx9");
            zip.execSync();
        }
        else {
            const zip = new tr.ToolRunner(tl.which("zip", true));
            const cwd = tl.cwd();
            tl.cd(input);
            zip.arg(path.join(cwd, output));
            zip.arg(".");
            zip.arg("-r");
            zip.arg("-9");
            zip.execSync();
            tl.cd(cwd);
        }
    }
    endEdit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.validateEditMode();
            if (!this.hasEdits()) {
                return Q(this.inputFile);
            }
            temp.track();
            return new Promise((resolve) => {
                temp.mkdir("vsixeditor", (ex, dirPath) => { resolve(dirPath); });
            })
                .then((dirPath) => {
                tl.debug("Extracting files to " + dirPath);
                this.extractArchive(this.inputFile, dirPath);
                return dirPath;
            })
                .then((dirPath) => __awaiter(this, void 0, void 0, function* () {
                if (this.versionNumber && this.updateTasksVersion || this.updateTasksId) {
                    tl.debug("Look for build tasks manifest");
                    const extensionManifest = path.join(dirPath, "extension.vsomanifest");
                    yield common.checkUpdateTasksManifests(extensionManifest);
                }
                return dirPath;
            }))
                .then(dirPath => {
                tl.debug("Editing VSIX manifest");
                return this.editVsixManifest(dirPath).then((manifestData) => manifestData);
            })
                .then((manifestData) => {
                manifestData.outputFileName = manifestData.createOutputFilePath(this.outputPath);
                return manifestData;
            })
                .then((manifestData) => {
                tl.debug(`Creating final archive file at ${this.outputPath}`);
                this.createArchive(manifestData.dirPath, manifestData.outputFileName);
                tl.debug("Final archive file created");
                return Promise.resolve(manifestData.outputFileName);
            }).catch(err => { return Promise.reject(err); });
        });
    }
    editVsixManifest(dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const x2jsLib = require("x2js");
            const x2js = new x2jsLib();
            const vsixManifestPath = path.join(dirPath, "extension.vsixmanifest");
            try {
                let vsixManifestData = yield fse.readFile(vsixManifestPath, "utf8");
                const vsixmanifest = x2js.xml2js(vsixManifestData);
                const identity = vsixmanifest.PackageManifest.Metadata.Identity;
                if (this.versionNumber) {
                    identity._Version = this.versionNumber;
                }
                if (this.id) {
                    identity._Id = this.id;
                }
                if (this.idTag) {
                    identity._Id += this.idTag;
                }
                if (this.publisher) {
                    identity._Publisher = this.publisher;
                }
                if (this.extensionName) {
                    vsixmanifest.PackageManifest.Metadata.DisplayName = this.extensionName;
                }
                if (this.extensionVisibility && this.extensionVisibility !== "default") {
                    const flagsEditor = new GalleryFlagsEditor(vsixmanifest.PackageManifest.Metadata.GalleryFlags);
                    const isPublic = this.extensionVisibility.indexOf("public") >= 0;
                    const isPreview = this.extensionVisibility.indexOf("preview") >= 0;
                    if (isPublic) {
                        flagsEditor.addPublicFlag();
                    }
                    else {
                        flagsEditor.removePublicFlag();
                    }
                    if (isPreview) {
                        flagsEditor.addPreviewFlag();
                    }
                    else {
                        flagsEditor.removePreviewFlag();
                    }
                    vsixmanifest.PackageManifest.Metadata.GalleryFlags = flagsEditor.toString();
                }
                if (this.extensionPricing && this.extensionPricing !== "default") {
                    const flagsEditor = new GalleryFlagsEditor(vsixmanifest.PackageManifest.Metadata.GalleryFlags);
                    const isFree = this.extensionPricing.indexOf("free") >= 0;
                    const isPaid = this.extensionPricing.indexOf("paid") >= 0;
                    if (isFree) {
                        flagsEditor.removePaidFlag();
                    }
                    if (isPaid) {
                        flagsEditor.addPaidFlag();
                    }
                    vsixmanifest.PackageManifest.Metadata.GalleryFlags = flagsEditor.toString();
                }
                vsixManifestData = x2js.js2xml(vsixmanifest);
                const manifestData = new ManifestData(identity._Version, identity._Id, identity._Publisher, this.extensionVisibility, this.extensionPricing, vsixmanifest.PackageManifest.Metadata.DisplayName, dirPath);
                yield fse.writeFile(vsixManifestPath, vsixManifestData, { encoding: "utf8" });
                return Promise.resolve(manifestData);
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
    }
    hasEdits() {
        return (this.versionNumber
            || this.id
            || this.idTag
            || this.publisher
            || this.extensionName
            || (this.extensionVisibility && this.extensionVisibility !== "default")
            || (this.extensionPricing && this.extensionPricing !== "default"))
            || this.updateTasksId;
    }
    editVersion(version) {
        this.validateEditMode();
        this.versionNumber = version;
    }
    editExtensionName(name) {
        this.validateEditMode();
        this.extensionName = name;
    }
    editExtensionVisibility(visibility) {
        this.validateEditMode();
        this.extensionVisibility = visibility;
    }
    editExtensionPricing(pricing) {
        this.validateEditMode();
        this.extensionPricing = pricing;
    }
    editId(id) {
        this.validateEditMode();
        this.id = id;
    }
    editIdTag(tag) {
        this.validateEditMode();
        this.idTag = tag;
    }
    editPublisher(publisher) {
        this.validateEditMode();
        this.publisher = publisher;
    }
    editUpdateTasksVersion(updateTasksVersion) {
        this.validateEditMode();
        this.updateTasksVersion = updateTasksVersion;
    }
    editUpdateTasksId(updateTasksId) {
        this.validateEditMode();
        this.updateTasksId = updateTasksId;
    }
    validateEditMode() {
        if (!this.edit) {
            throw new Error("Editing is not started");
        }
    }
}
exports.VSIXEditor = VSIXEditor;
//# sourceMappingURL=vsixeditor.js.map