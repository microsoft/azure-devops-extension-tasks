"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildTaskUpload = exports.getCommand = void 0;
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const tasksBase = require("./default");
const trace = require("../../../lib/trace");
const vm = require("../../../lib/jsonvalidate");
const zip = require("jszip");
function getCommand(args) {
    return new BuildTaskUpload(args);
}
exports.getCommand = getCommand;
var c_taskJsonFile = "task.json";
class BuildTaskUpload extends tasksBase.BuildTaskBase {
    constructor() {
        super(...arguments);
        this.description = "Upload a Build Task.";
        this.serverCommand = true;
    }
    getHelpArgs() {
        return ["taskPath", "taskZipPath", "overwrite"];
    }
    async exec() {
        const taskPaths = await this.commandArgs.taskPath.val();
        const taskZipPath = await this.commandArgs.taskZipPath.val();
        const overwrite = await this.commandArgs.overwrite.val();
        let taskStream = null;
        let taskId = null;
        let sourceLocation = null;
        if (!taskZipPath && !taskPaths) {
            throw new Error("You must specify either --task-path or --task-zip-path.");
        }
        if (taskZipPath) {
            // User provided an already zipped task, upload that.
            const data = fs.readFileSync(taskZipPath);
            const z = await zip.loadAsync(data);
            // find task.json inside zip, make sure its there then deserialize content
            const fileContent = await z.files[c_taskJsonFile].async('text');
            const taskJson = JSON.parse(fileContent);
            sourceLocation = taskZipPath;
            taskId = taskJson.id;
            taskStream = fs.createReadStream(taskZipPath);
        }
        else {
            // User provided the path to a directory with the task content
            const taskPath = taskPaths[0];
            vm.exists(taskPath, "specified directory " + taskPath + " does not exist.");
            const taskJsonPath = path.join(taskPath, c_taskJsonFile);
            const taskJson = vm.validate(taskJsonPath, "no " + c_taskJsonFile + " in specified directory");
            const archive = archiver("zip");
            archive.on("error", function (error) {
                trace.debug("Archiving error: " + error.message);
                error.message = "Archiving error: " + error.message;
                throw error;
            });
            archive.directory(path.resolve(taskPath), false);
            archive.finalize();
            sourceLocation = taskPath;
            taskId = taskJson.id;
            taskStream = archive;
        }
        const collectionUrl = this.connection.getCollectionUrl();
        trace.info("Collection URL: " + collectionUrl);
        const agentApi = await this.webApi.getTaskAgentApi(collectionUrl);
        await agentApi.uploadTaskDefinition(null, taskStream, taskId, overwrite);
        trace.debug("Success");
        return { sourceLocation: sourceLocation, };
    }
    friendlyOutput(data) {
        trace.println();
        trace.success("Task at %s uploaded successfully!", data.sourceLocation);
    }
}
exports.BuildTaskUpload = BuildTaskUpload;
//# sourceMappingURL=upload.js.map