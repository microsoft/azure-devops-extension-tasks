import temp = require("temp");
import fs = require("fs");
import path = require("path");
import Q = require("q");
import tl = require("vsts-task-lib/task");
import tr = require("vsts-task-lib/toolrunner");
import common = require("./common");

export class VSIXEditor {
    private edit: boolean = false;
    private versionNumber: string = null;
    private id: string = null;
    private idTag: string = null;
    private publisher: string = null;
    private extensionName: string = null;
    private extensionVisibility: string = null;
    private extensionPricing: string = null;
    private updateTasksVersion: boolean = true;

    constructor(
        public inputFile: string,
        public outputPath: string) {
    }

    public startEdit() {
        if (this.edit) { throw new Error("Edit is already started"); }
        this.edit = true;
        tl.debug("Editing started");
    }

    private extractArchive(input: string, output: string): void {
        if (tl.osType() === "Windows_NT") {
            const sevenZip = require("7zip-bin-win");
            const zip = new tr.ToolRunner(sevenZip.path7za);
            zip.arg("x");
            zip.arg(input);          // file to extract
            zip.arg(`-o${output}`);  // redirect output to dir
            zip.arg("-y");           // assume yes on all queries
            zip.arg("-spd");         // disable wildcards
            zip.arg("-aoa");         // overwrite all
            zip.execSync();
        }
        else {
            const zip = new tr.ToolRunner(tl.which("unzip", true));
            zip.arg("-o");           // overwrite all
            zip.arg("-d");           // redirect output to
            zip.arg(output);         // output directory
            zip.arg(input);          // file to extract
            zip.execSync();
        }
    }

    private createArchive(input: string, output: string): void {
        if (tl.osType() === "Windows_NT") {
            const sevenZip = require("7zip-bin-win");
            const zip = new tr.ToolRunner(sevenZip.path7za);
            zip.arg("a");
            zip.arg(output);         // redirect output to file
            zip.arg(path.join(input, "\*"));
            zip.arg("-r");           // recursive
            zip.arg("-y");           // assume yes on all queries
            zip.arg("-tzip");        // zip format
            zip.arg("-mx9");         // max compression level
            zip.execSync();
        }
        else {
            const zip = new tr.ToolRunner(tl.which("zip", true));
            const cwd = tl.cwd();
            tl.cd(input);
            zip.arg(path.join(cwd, output));         // redirect output to file
            zip.arg(".");
            zip.arg("-r");           // recursive
            zip.arg("-9");           // max compression level
            zip.execSync();
            tl.cd(cwd);
        }
    }

    public endEdit(): Q.Promise<string> {
        this.validateEditMode();

        if (!this.hasEdits()) { return Q(this.inputFile); }

        const deferred = Q.defer<string>();

        temp.track();

        Q.nfcall(temp.mkdir, "vsixeditor")
            .then((dirPath: string) => {
                tl.debug("Finalizing edit");
                tl.debug("Extracting files to " + dirPath);

                this.extractArchive(this.inputFile, dirPath);
                return dirPath;
            })
            .then(dirPath => {
                if (this.versionNumber && this.updateTasksVersion) {
                    tl.debug("Look for build tasks manifest");
                    const extensionManifest = path.join(dirPath, "extension.vsomanifest");
                    return common.checkUpdateTasksVersion(extensionManifest).then(() => dirPath);
                }
                else {
                    return dirPath;
                }
            })
            .then(dirPath => {
                tl.debug("Editing VSIX manifest");
                return this.editVsixManifest(dirPath).then((manifestData: ManifestData) => manifestData);
            })
            .then((manifestData: ManifestData) => {
                let dirPath = manifestData.dirPath;
                return manifestData.createOutputFilePath(this.outputPath).then((outputFile) => {
                    manifestData.outputFileName = outputFile;
                    return manifestData;
                });
            })
            .then((manifestData: ManifestData) => {
                tl.debug("Creating final archive file at " + this.outputPath);
                this.createArchive(manifestData.dirPath, manifestData.outputFileName);
                deferred.resolve(manifestData.outputFileName);
                tl.debug("Final archive file created");
            })
            .fail(err => deferred.reject(err));

        return deferred.promise;
    }

    private editVsixManifest(dirPath: string) {
        let deferred = Q.defer<ManifestData>();
        let x2jsLib = require("x2js");
        let x2js = new x2jsLib();

        let vsixManifestPath = path.join(dirPath, "extension.vsixmanifest");
        fs.readFile(vsixManifestPath, "utf8", (err, vsixManifestData) => {
            if (err) { throw err; }

            let vsixmanifest = x2js.xml2js(vsixManifestData);
            let identity = vsixmanifest.PackageManifest.Metadata.Identity;

            if (this.versionNumber) { identity._Version = this.versionNumber; }
            if (this.id) { identity._Id = this.id; }
            if (this.idTag) { identity._Id += this.idTag; }
            if (this.publisher) { identity._Publisher = this.publisher; }
            if (this.extensionName) { vsixmanifest.PackageManifest.Metadata.DisplayName = this.extensionName; }
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
            let manifestData = new ManifestData(identity._Version,
                identity._Id,
                identity._Publisher,
                this.extensionVisibility,
                this.extensionPricing,
                vsixmanifest.PackageManifest.Metadata.DisplayName,
                dirPath);

            fs.writeFile(vsixManifestPath, vsixManifestData, { encoding: "utf8" }, () => {
                deferred.resolve(manifestData);
            });
        });

        return deferred.promise;
    }

    public hasEdits(): boolean {
        return <boolean>(this.versionNumber
            || this.id
            || this.idTag
            || this.publisher
            || this.extensionName
            || (this.extensionVisibility && this.extensionVisibility !== "default")
            || (this.extensionPricing && this.extensionPricing !== "default"));
    }

    public editVersion(version: string) {
        this.validateEditMode();
        this.versionNumber = version;
    }

    public editExtensionName(name: string) {
        this.validateEditMode();
        this.extensionName = name;
    }

    public editExtensionVisibility(visibility: string) {
        this.validateEditMode();
        this.extensionVisibility = visibility;
    }

    public editExtensionPricing(pricing: string) {
        this.validateEditMode();
        this.extensionPricing = pricing;
    }

    public editId(id: string) {
        this.validateEditMode();
        this.id = id;
    }

    public editIdTag(tag: string) {
        this.validateEditMode();
        this.idTag = tag;
    }

    public editPublisher(publisher: string) {
        this.validateEditMode();
        this.publisher = publisher;
    }

    public editUpdateTasksVersion(updateTasksVersion: boolean) {
        this.validateEditMode();
        this.updateTasksVersion = updateTasksVersion;
    }

    private validateEditMode() {
        if (!this.edit) { throw new Error("Editing is not started"); }
    }
}

class ManifestData {
    public outputFileName: string;
    constructor(public version: string,
        public id: string,
        public publisher: string,
        public visibility: string,
        public pricing: string,
        public name: string,
        public dirPath: string) { }

    public createOutputFilePath(outputPath: string): Q.Promise<string> {
        let deferred = Q.defer<string>();
        let fileName = `${this.publisher}.${this.id}-${this.version}.gen.vsix`;

        const updateFileName = (fileName: string, iteration: number) => {
            if (iteration > 0) {
                let gen = "00".substring(0, "00".length - iteration.toString().length) + iteration;
                fileName = `${this.publisher}.${this.id}-${this.version}.gen${gen}.vsix`;
            }
            fs.exists(path.join(outputPath, fileName), result => {
                if (result) {
                    updateFileName(fileName, ++iteration);
                } else {
                    tl.debug("Generated filename: " + fileName);
                    deferred.resolve(fileName);
                }
            });
        };

        updateFileName(fileName, 0);

        return deferred.promise;
    }
}

class GalleryFlagsEditor {
    flags: string[] = [];
    constructor(galleryFlagsEditor: string) {
        if (galleryFlagsEditor) {
            this.flags = galleryFlagsEditor.split(" ").filter(f => f != null && f !== "");
        }
    }

    private addFlag(flag: string) {
        if (this.flags.indexOf(flag) < 0) { this.flags.push(flag); }
    }

    private removeFlag(flag: string) {
        const index = this.flags.indexOf(flag);
        if (index >= 0) { this.flags.splice(index, 1); }
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

    toString(): string {
        return this.flags.join(" ");
    }
}
