var path = require("path");
var fs = require("fs");
var jsonfile = require('jsonfile')

function getBuildTasks() {
    return fs.readdirSync(path.join(__dirname, "../BuildTasks")).filter(function (file) {
        return ["common", "typings"].indexOf(file.toLowerCase()) < 0
            && fs.statSync(path.join(buildTasksDir, file)).isDirectory();
    });
}

var args = process.argv.slice(2);

var newVersionValues = args[0].split('.');  // should be a string like 1.2.3

var newVersion = {
    "Major": parseInt(newVersionValues[0], 10),
    "Minor": parseInt(newVersionValues[1], 10),
    "Patch": parseInt(newVersionValues[2], 10),
}

console.log("Setting all task versions to: " + JSON.stringify(newVersion));

var buildTasksDir = path.join(__dirname, "../BuildTasks");
var buildTaskNames = getBuildTasks();
buildTaskNames.forEach(function(name) {
    var taskJsonFiles = [
        path.join(buildTasksDir, name, "task.json"),
        path.join(buildTasksDir, name, "task.loc.json")
    ];

    taskJsonFiles.forEach(function(taskJsonFile) {
        console.log("Updating: " + taskJsonFile);
        if (fs.existsSync(taskJsonFile)) {
            var task = jsonfile.readFileSync(taskJsonFile);
    
            task["version"] = newVersion;
    
            jsonfile.writeFileSync(taskJsonFile, task, {spaces: 2, EOL: '\r\n'});
        }
    });
});

