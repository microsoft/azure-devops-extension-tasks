"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCreate = exports.getCommand = void 0;
const check = require("validator");
const fs = require("fs");
const path = require("path");
const shell = require("shelljs");
const tasksBase = require("./default");
const trace = require("../../../lib/trace");
const uuid_1 = require("uuid");
function getCommand(args) {
    return new TaskCreate(args);
}
exports.getCommand = getCommand;
class TaskCreate extends tasksBase.BuildTaskBase {
    constructor(args) {
        super(args);
        this.description = "Create files for new Build Task";
        this.serverCommand = false;
    }
    getHelpArgs() {
        return ["taskName", "friendlyName", "description", "author"];
    }
    async exec() {
        trace.debug("build-create.exec");
        return Promise.all([
            this.commandArgs.taskName.val(),
            this.commandArgs.friendlyName.val(),
            this.commandArgs.description.val(),
            this.commandArgs.author.val(),
        ]).then(values => {
            const [taskName, friendlyName, description, author] = values;
            if (!taskName || !check.isAlphanumeric(taskName)) {
                throw new Error("name is a required alphanumeric string with no spaces");
            }
            if (!friendlyName || !check.isLength(friendlyName, 1, 40)) {
                throw new Error("friendlyName is a required string <= 40 chars");
            }
            if (!description || !check.isLength(description, 1, 80)) {
                throw new Error("description is a required string <= 80 chars");
            }
            if (!author || !check.isLength(author, 1, 40)) {
                throw new Error("author is a required string <= 40 chars");
            }
            let ret = {};
            // create definition
            trace.debug("creating folder for task");
            let tp = path.join(process.cwd(), taskName);
            trace.debug(tp);
            shell.mkdir("-p", tp);
            trace.debug("created folder");
            ret.taskPath = tp;
            trace.debug("creating definition");
            let def = {};
            def.id = (0, uuid_1.v1)();
            trace.debug("id: " + def.id);
            def.name = taskName;
            trace.debug("name: " + def.name);
            def.friendlyName = friendlyName;
            trace.debug("friendlyName: " + def.friendlyName);
            def.description = description;
            trace.debug("description: " + def.description);
            def.author = author;
            trace.debug("author: " + def.author);
            def.helpMarkDown = "Replace with markdown to show in help";
            def.category = "Utility";
            def.visibility = ["Build", "Release"];
            def.demands = [];
            def.version = { Major: "0", Minor: "1", Patch: "0" };
            def.minimumAgentVersion = "1.95.0";
            def.instanceNameFormat = taskName + " $(message)";
            let cwdInput = {
                name: "cwd",
                type: "filePath",
                label: "Working Directory",
                defaultValue: "",
                required: false,
                helpMarkDown: "Current working directory when " + taskName + " is run.",
            };
            let msgInput = {
                name: "msg",
                type: "string",
                label: "Message",
                defaultValue: "Hello World",
                required: true,
                helpMarkDown: "Message to echo out",
            };
            def.inputs = [cwdInput, msgInput];
            def.execution = {
                Node: {
                    target: "sample.js",
                    argumentFormat: "",
                },
                PowerShell3: {
                    target: "sample.ps1",
                },
            };
            ret.definition = def;
            trace.debug("writing definition file");
            let defPath = path.join(tp, "task.json");
            trace.debug(defPath);
            try {
                let defStr = JSON.stringify(def, null, 2);
                trace.debug(defStr);
                fs.writeFileSync(defPath, defStr);
            }
            catch (err) {
                throw new Error("Failed creating task: " + err.message);
            }
            trace.debug("created definition file.");
            let copyResource = function (fileName) {
                let src = path.join(__dirname, "_resources", fileName);
                trace.debug("src: " + src);
                let dest = path.join(tp, fileName);
                trace.debug("dest: " + dest);
                shell.cp(src, dest);
                trace.debug(fileName + " copied");
            };
            trace.debug("creating temporary icon");
            copyResource("icon.png");
            copyResource("sample.js");
            copyResource("sample.ps1");
            return ret;
        });
    }
    friendlyOutput(data) {
        if (!data) {
            throw new Error("no results");
        }
        trace.println();
        trace.success("created task @ %s", data.taskPath);
        let def = data.definition;
        trace.info("id   : %s", def.id);
        trace.info("name: %s", def.name);
        trace.println();
        trace.info("A temporary task icon was created.  Replace with a 32x32 png with transparencies");
    }
}
exports.TaskCreate = TaskCreate;
//# sourceMappingURL=create.js.map