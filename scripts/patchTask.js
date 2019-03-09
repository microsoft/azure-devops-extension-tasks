var yargs = require("yargs");
var chalks = require("chalk");
var glob = require("glob");
var path = require("path");
var fs = require("fs-extra");

var argv = yargs.argv;
var chalk = chalks.default;
var taskids = require("./taskids.json");
var currentDir = path.resolve(process.cwd(), "BuildTasks", argv.task);
var files = glob.sync("**/task.json", { cwd: currentDir });
files.forEach(file => {
    var taskFile = path.resolve(currentDir, file);
    console.log(`Processing ${chalk.green(taskFile)}`);
    var taskJson = require(path.relative(__dirname, taskFile));
    var cacheTaskId = taskJson.id;
    var cacheFriendlyName = taskJson.friendlyName;
    var newname = taskJson.friendlyName.replace(/Dev:/gi, '').trim();
    var task = taskids.tasks.filter(item => item.name === argv.task)[0];
    if (argv.patch) {
        console.log(chalk.yellow("Applying task id for DEV testing"));
        taskJson.id = task.betaId;
        taskJson.friendlyName = `Dev: ${newname}`;
    }
    else {
        console.log(chalk.yellow("Applying task id for PROD"));
        taskJson.id = task.prodId;
        taskJson.friendlyName = newname;
    }
    console.log(`Changed task id from ${chalk.magenta(cacheTaskId)} to ${chalk.blue(taskJson.id)}`);
    console.log(`Changed friendlyName from ${chalk.magenta(cacheFriendlyName)} to ${chalk.blue(taskJson.friendlyName)}`);
    fs.writeJsonSync(taskFile, taskJson, { spaces: "\t" });
    console.log(chalk.green("=========="));

});
