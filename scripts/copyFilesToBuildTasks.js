var path = require("path");
var copyfiles = require("copyfiles");
var Q = require("q");
var fs = require("fs");

function getBuildTasks() {
    var buildTasksDir = path.join(__dirname, "../BuildTasks");
    return fs.readdirSync(path.join(__dirname, "../BuildTasks")).filter(function (file) {
        return ["common", "typings"].indexOf(file.toLowerCase()) < 0
            && fs.statSync(path.join(buildTasksDir, file)).isDirectory();
    });
}

var copyfilesArgs = process.argv.slice(2);
var baseOutDirTasks = copyfilesArgs.pop();

var upArgIndex = copyfilesArgs.indexOf("-u");
var upArg = 0;

if (upArgIndex >= 0) {
    upArg = parseInt(copyfilesArgs[upArgIndex + 1], 10);
    copyfilesArgs.splice(upArgIndex, 2);
}

var buildTasks = getBuildTasks();
var promisses = buildTasks.map(function (taskName) {
    var deferred = Q.defer();

    var filesSpec = copyfilesArgs.concat(path.join(baseOutDirTasks, taskName));

    copyfiles(filesSpec, upArg, function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
});

Q.all(promisses)
    .fail(function (err) {
        console.error(err);
        process.exit(1);
    });
