///<reference path="../typings/main.d.ts" />

//  W A R N I N G!
// This file is copied to each build task.
// Any change should be made in the file that is in the Common folder

import os = require('os');
import tl = require('vsts-task-lib/task');
import trl = require('vsts-task-lib/toolrunner');
import ToolRunner = trl.ToolRunner; 

export function runTfx(cmd : (tfx: ToolRunner) => void) {
    var tfx : ToolRunner;
    
    // Check the global tfx
    var tfxPath = tl.which('tfx');
    if (tfxPath) {
        tfx = tl.createToolRunner(tfxPath);
        cmd(tfx);
        return;
    }
        
    // Check the local tfx (due a previous installation)
    var tfxLocalPath = 'node_modules/.bin/tfx';
    // On windows we are looking for tfx.cmd
    if (os.platform().toLowerCase().indexOf('win') >= 0) {
        tfxLocalPath += '.cmd';
    }
    
    tfxPath = tl.which(tfxLocalPath);
    if (tfxPath) {
        tfx = tl.createToolRunner(tfxPath);
        cmd(tfx);
        return;
    }    
    
    console.log('Could not find tfx command. Preparing to install it');
    
    var npm = tl.createToolRunner(tl.which('npm', true));
    npm.arg('install tfx-cli');
    
    npm.exec().then(code => {
      tfx = tl.createToolRunner(tl.which(tfxLocalPath, true));
      cmd(tfx);  
    }).fail(err => {
        tl.setResult(tl.TaskResult.Failed, `Error installing tfx: ${err}`);
    });
}