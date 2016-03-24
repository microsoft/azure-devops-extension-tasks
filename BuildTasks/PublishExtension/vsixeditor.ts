/// <reference path="../typings/main.d.ts" />
import AdmZip = require("adm-zip");
import temp = require("temp");
import fs = require("fs");
import path = require("path");
import Q = require("q");
import tl = require("vsts-task-lib/task");
import _ = require("lodash");

export class VSIXEditor {
    private zip: AdmZip;
    private edit: boolean = false;

    private versionNumber: string = null;
    private id: string = null;
    private publisher: string = null;
    private extensionName: string = null;
    private extensionVisibility: string = null;

    constructor(public inputFile: string,
        public outputPath: string) {
        this.zip = new AdmZip(inputFile);
    }

    public startEdit() {
        if (this.edit) { throw new Error("Edit is already started"); }
        this.edit = true;
        tl.debug("Editing started");
    }

    public endEdit(): Q.Promise<any> {
        this.validateEditMode();

        if (!this.hasEdits()) { return Q(this.inputFile); }

        const deferred = Q.defer<string>();

        temp.track();

        Q.nfcall(temp.mkdir, "vsixeditor")
            .then((dirPath: string) => {
                tl.debug("Finalizing edit");
                tl.debug("Extracting files to " + dirPath);
                this.zip.extractAllTo(dirPath, true);
                return dirPath;
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
                let outputFile = manifestData.outputFileName;
                let output = fs.createWriteStream(outputFile);

                let archiver = require("archiver");
                let archive = archiver("zip");

                tl.debug("Creating final archive file at " + this.outputPath);

                output.on("close", function () {
                    tl.debug(archive.pointer() + " total bytes");
                    tl.debug("archiver has been finalized and the output file descriptor has closed.");
                    deferred.resolve(outputFile);
                });

                archive.on("error", err => deferred.reject(err));

                archive.pipe(output);

                archive.bulk([
                    { expand: true, cwd: manifestData.dirPath, src: ["**/*"] }
                ]);
                archive.finalize();
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
            if (this.publisher) { identity._Publisher = this.publisher; }
            if (this.editExtensionName) { vsixmanifest.PackageManifest.Metadata.DisplayName = this.extensionName; }
            if (this.extensionVisibility) {
                let flagsEditor = new GalleryFlagsEditor(vsixmanifest.PackageManifest.Metadata.GalleryFlags);

                if (this.extensionVisibility.toLowerCase() === "private") {
                    vsixmanifest.PackageManifest.Metadata.GalleryFlags = flagsEditor.removePublicFlag();
                } else if (this.extensionVisibility.toLowerCase() === "public") {
                    vsixmanifest.PackageManifest.Metadata.GalleryFlags = flagsEditor.addPublicFlag();
                }
            }
            vsixManifestData = x2js.js2xml(vsixmanifest);
            let manifestData = new ManifestData(identity._Version,
                identity._Id,
                identity._Publisher,
                this.extensionVisibility,
                vsixmanifest.PackageManifest.Metadata.DisplayName,
                dirPath);

            fs.writeFile(vsixManifestPath, vsixManifestData, () => {
                deferred.resolve(manifestData);
            });
        });

        return deferred.promise;
    }

    public hasEdits(): boolean {
        return <boolean>(this.versionNumber
            || this.id
            || this.publisher
            || this.extensionName
            || (this.extensionVisibility && this.extensionVisibility !== "default"));
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

    public editId(id: string) {
        this.validateEditMode();
        this.id = id;
    }

    public editPublisher(publisher: string) {
        this.validateEditMode();
        this.publisher = publisher;
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
        public name: string,
        public dirPath: string) { }

    public createOutputFilePath(outputPath: string): Q.Promise<string> {
        let deferred = Q.defer<string>();
        let fileName = "mynewvsix02.zip";

        this.updateFileName(outputPath, fileName).then(newFileName => {
            deferred.resolve(path.join(outputPath, newFileName));
        });

        return deferred.promise;
    }

    public updateFileName(outputPath: string, fileName: string) {

        return Q.Promise(function (resolve) {

            let testFileName = path.join(outputPath, fileName);

            fs.exists(testFileName, (result) => {
                if (result) {
                    fileName = fileName.replace(/(\D+)(\d+)(\D+)$/, function (str, m1, m2, m3) {
                        var newstr = (+m2 + 1) + "";
                        return m1 + new Array(3 - newstr.length).join("0") + newstr + m3;
                    });

                    resolve(this.updateFileName(outputPath, fileName));
                }
                else {
                    resolve(fileName);
                }
            });
        });
    }
}
class GalleryFlagsEditor {
    constructor(public galleryFlagsEditor: string) {
    }

    public addPublicFlag(): string {
        let flags = this.getFlags();
        flags.push("Public");
        return this.joinFlags(flags);
    }

    public removePublicFlag(): string {
        let flags = this.getFlags();
        _.remove(flags, v => v === "Public");
        return this.joinFlags(flags);
    }

    private joinFlags(flags: string[]): string {
        return _.uniq(flags).join(" ");
    }

    private getFlags(): string[] {
        let flags = this.galleryFlagsEditor.split(" ");
        _.remove(flags, v => v === "");
        return flags;
    }
}
