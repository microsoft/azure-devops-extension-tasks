/// <reference path="../typings/main.d.ts" />
import AdmZip = require("adm-zip");
import temp = require("temp");
import fs = require("fs");
import path = require("path");
import Q = require("q");
import tl = require("vsts-task-lib/task");

export class VSIXEditor {
    private zip: AdmZip;
    private edit: boolean = false;

    private versionNumber: string = null;
    private id: string = null;
    private publisher: string = null;
    private extensionName: string = null;
    private extensionVisibility: string = null;

    constructor(public input: string,
        public output: string) {
        this.zip = new AdmZip(input);
    }

    public startEdit() {
        if (this.edit) { throw "Edit is already started"; }
        this.edit = true;
        tl.debug("Editing started");
    }

    public endEdit() {
        this.validateEditMode();

        if (this.hasEdits()) {
            temp.track();

            temp.mkdir("visxeditor", (err, dirPath) => {
                if (err) { throw err; }
                tl.debug("Finalizing edit");
                tl.debug("Extracting files to " + dirPath);
                this.zip.extractAllTo(dirPath, true);

                this.editVsixManifest(dirPath)
                    .then(() => {
                        this.editVsoManifest(dirPath).then(() => {
                            let archiver = require("archiver");
                            let output = fs.createWriteStream(this.output);
                            let archive = archiver("zip");

                            tl.debug("Creating final archive file at " + this.output);

                            output.on("close", function() {
                                tl.debug(archive.pointer() + " total bytes");
                                tl.debug("archiver has been finalized and the output file descriptor has closed.");
                            });

                            archive.on("error", function(err) {
                                throw err;
                            });

                            archive.pipe(output);

                            archive.bulk([
                                { expand: true, cwd: dirPath, src: ["**/*"] }
                            ]);
                            archive.finalize();
                            tl.debug("Final archive file created");
                        });
                    });
            });
        }
    }

    private editVsoManifest(dirPath: string) {
        let deferred = Q.defer<boolean>();

        let vsoManifestPath = path.join(dirPath, "extension.vsomanifest");
        fs.readFile(vsoManifestPath, "utf8", (err, vsoManifestData) => {
            if (err) { throw err; }
            fs.writeFile(vsoManifestPath, vsoManifestData, () => {
                deferred.resolve(true);
            });
        });
        return deferred.promise;
    }

    private editVsixManifest(dirPath: string) {
        let deferred = Q.defer<boolean>();
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
            if (this.extensionVisibility) { vsixmanifest.PackageManifest.Metadata.GalleryFlags += this.extensionVisibility }
            vsixManifestData = x2js.js2xml(vsixmanifest);

            fs.writeFile(vsixManifestPath, vsixManifestData, () => {
                deferred.resolve(true);
            });
            deferred.resolve(true);
        });

        return deferred.promise;
    }

    public hasEdits(): boolean {
        return this.versionNumber != null
            || this.id != null
            || this.publisher != null
            || this.extensionName != null
            || this.extensionVisibility != null
            || this.extensionName != null;
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

        if (visibility == "public") {
            this.extensionVisibility = "Public";
        }
        else {
            this.extensionVisibility = "";
        }
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
        if (!this.edit) { throw "Editing is not started"; }
    }
}