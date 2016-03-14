/// <reference path="../typings/main.d.ts" />

import AdmZip = require("adm-zip")
import temp = require('temp');
import fs = require('fs');
import path = require('path');
import Q = require("q");

class VSIXEditor {
    private zip: AdmZip;
    private outputPath: string;
    private edit: boolean = false;

    private versionNumber: string = null;
    private id: string = null;
    private publisher: string = null;

    constructor(input: string, output: string) {
        this.outputPath = output;
        this.zip = new AdmZip(input);
    }

    public startEdit() {
        if (this.edit) throw "Edit is already started";
        this.edit = true;
    }

    public endEdit() {
        this.validateEditMode();

        if (this.hasEdits()) {
            temp.track();

            temp.mkdir("visxeditor", (err, dirPath) => {
                if (err) throw err;

                this.zip.extractAllTo(dirPath, true);

                this.EditVsixManifest(dirPath)
                    .then(() => {
                        this.EditVsoManifest(dirPath).then(() => {
                            var archiver = require('archiver');
                            var output = fs.createWriteStream(this.outputPath);
                            var archive = archiver('zip');

                            output.on('close', function () {
                                console.log(archive.pointer() + ' total bytes');
                                console.log('archiver has been finalized and the output file descriptor has closed.');
                            });

                            archive.on('error', function (err) {
                                throw err;
                            });

                            archive.pipe(output);

                            archive.bulk([
                                { expand: true, cwd: dirPath, src: ['**/*'] }
                            ]);
                            archive.finalize();
                        });
                    });


            });
        }
    }
    private EditVsoManifest(dirPath: string) {
        var deferred = Q.defer<boolean>();

        var vsoManifestPath = path.join(dirPath, 'extension.vsomanifest');
        fs.readFile(vsoManifestPath, 'utf8', (err, vsoManifestData) => {
            if (err) throw err;
            fs.writeFile(vsoManifestPath, vsoManifestData, () => {
                deferred.resolve(true)
            });
        });
        return deferred.promise;
    }

    private EditVsixManifest(dirPath: string) {
        var deferred = Q.defer<boolean>();
        var x2jsLib = require('x2js');
        var x2js = new x2jsLib();

        var vsixManifestPath = path.join(dirPath, 'extension.vsixmanifest');
        fs.readFile(vsixManifestPath, 'utf8', (err, vsixManifestData) => {
            if (err) throw err;

            var vsixmanifest = x2js.xml2js(vsixManifestData);
            var identity = vsixmanifest.PackageManifest.Metadata.Identity;
            if (this.versionNumber) identity._Version = this.versionNumber;
            if (this.id) identity._Id = this.id;
            if (this.publisher) identity._Publisher = this.publisher;

            vsixManifestData = x2js.js2xml(vsixmanifest);

            fs.writeFile(vsixManifestPath, vsixManifestData, () => {
                deferred.resolve(true)
            });
            deferred.resolve(true);
        });


        return deferred.promise;
    }

    private hasEdits(): boolean {
        return this.versionNumber != null
    }
    public EditVersion(version: string) {
        this.validateEditMode();
        this.versionNumber = version;
    }

    public EditId(id: string) {
        this.validateEditMode();
        this.id = id;
    }

    public EditPublisher(publisher: string) {
        this.validateEditMode();
        this.publisher = publisher;
    }

    private validateEditMode() {
        if (!this.edit) throw "Editing is not started";
    }
}