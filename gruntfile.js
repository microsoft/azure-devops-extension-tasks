var url = require('url');
var shell = require('shelljs')
var path = require('path');
var semver = require('semver');
var fs = require('fs');
var cp = require('child_process');

var NPM_MIN_VER = '3.0.0';

module.exports = function (grunt) {

  // Caller-provided options  
  var vsoContentHosting = grunt.option('vsoContentHosting') || false;
  var baseUri = grunt.option('baseUri') || 'http://localhost:1111';
  var release = grunt.option('release');
  var publisher = grunt.option('publisher') || 'ms-devlabs';

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-contrib-watch');
  
  // Project configuration
  grunt.initConfig({
    dirs: {
      output: {
        base: "dist/",
        web: "dist/Web/",
        buildTasks: "dist/BuildTasks/"
      }
    },
    clean: {
      dist: ['dist']
    }
  });

  var typeScriptConfig = {
    base: {
      src: ['Web/scripts/**/*.ts'],
      dest: '<%= dirs.output.web %>',
      options: {
        module: 'amd',
        target: 'es5',
        basePath: 'Web',
        keepDirectoryHierarchy: true,
        sourceMap: false,
        declaration: false
      }
    }
  };

  var copyConfig = {
    main: {
      files: [
        {
          expand: true,
          cwd: 'Web',
          src: ['**/*.{html,css,png,jpg,js}', '**/Templates/**/Files/**', '**/PlaygroundSamples/**', '**/ref/**', '**/CodeEditor/**'],
          dest: '<%= dirs.output.web %>'
        },
        {
          expand: true,
          src: 'vss-extension*.json',
          dest: '<%= dirs.output.base %>'
        },
        {
          expand: true,
          src: [ '*.md', '*.txt', '*.config' ],
          dest: '<%= dirs.output.base %>'
        },
        {
          expand: true,
          cwd: 'BuildTasks',
          src: '**/',
          dest: '<%= dirs.output.buildTasks %>'
        }        
      ]
    }
  };

  var prepManifestConfig = {
    main: {
      manifest: '<%= dirs.output.packages %>' + 'vss-extension.json',
      newBaseUri: baseUri + '/' + (release ? release + '/' : "")
    }
  };
  
  var watchConfig = {
    tsfiles: {
      files: ['Web/scripts/**/*.ts'],
      tasks: ['typescript'],
      options: {
        spawn: false,
      },
    },
    assets: {
      files: ['Web/**/*.{html,css,png,jpg,js}', 'Web/**/Templates/**/Files/**'],
      tasks: ['copy'],
      options: {
        spawn: false,
      },
    }
  }
  
  var linkBuildTasksConfig = {
    modules: {
      buildTasksDir: '<%= dirs.output.buildTasks %>',
      tempFolder: '_temp',
      tasksToLink: ['PackageExtension', 'PublishExtension'],
      pkg: {
        "name": "temp",
        "version": "1.0.0",
        "description": "temp to avoid warnings",
        "main": "index.js",
        "dependencies": {},
        "devDependencies": {},
        "repository": "http://norepo/but/nowarning",
        "scripts": {
          "test": "echo \"Error: no test specified\" && exit 1"
        },
        "author": "",
        "license": "MIT"
      }
    }  
  };

  grunt.config('typescript', typeScriptConfig);
  grunt.config('copy', copyConfig);
  grunt.config('prepManifest', prepManifestConfig);
  grunt.config('watch', watchConfig);
  grunt.config('linkBuildTasks', linkBuildTasksConfig);
    
  // Register build task
  grunt.registerTask('build', ['clean', 'typescript', 'copy', 'linkBuildTasks']);
  
  // Register custom "prep manifest" task
  grunt.task.registerMultiTask('prepManifest', 'Prep the manifest by updating base URI and publisher', function () {
    
    // Update extension manifest with updated base URI
    var manifest = grunt.file.readJSON(this.data.manifest);
    
    if (vsoContentHosting) {
      delete manifest.baseUri;
    } else if (manifest.baseUri != undefined) {
      manifest.baseUri = this.data.newBaseUri;
    }
      
    // Update publisher
    if (manifest.publisher != undefined) {
      manifest.publisher = publisher;
    }

    grunt.file.write(this.data.manifest, JSON.stringify(manifest, null, 4));
  }); 
  
  // Register prep package and deploy tasks
  grunt.registerTask('prepPackage', ['build', 'prepManifest']);

  grunt.registerTask('default', ['build']);
  
  grunt.registerMultiTask('linkBuildTasks', 'Add vso-tak-lib to each build task', function() {
    var tempPath = path.join(this.data.buildTasksDir, this.data.tempFolder); 
    var node_modulesPath = path.join(tempPath, 'node_modules');
    
    grunt.log.writeln('Getting latest vso-task-lib');
    shell.mkdir('-p', node_modulesPath);

    fs.writeFileSync(path.join(tempPath, 'package.json'), JSON.stringify(this.data.pkg, null, 2));
  
    shell.pushd(tempPath);
  
    var npmPath = shell.which('npm');
    if (!npmPath) {
      throw new Error('npm not found.  ensure npm 3 or greater is installed');
    }
  
    // check npm version
    var s = cp.execSync('"' + npmPath + '" --version');
    var ver = s.toString().replace(/[\n\r]+/g, '')
    console.log('version: "' + ver + '"');
  
    if (semver.lt(ver, NPM_MIN_VER)) {
      throw new Error('NPM version must be at least ' + NPM_MIN_VER + '. Found ' + ver);
    }
  
    var cmdline = '"' + npmPath + '" install vso-task-lib';
  
    var res = cp.execSync(cmdline); 
    grunt.log.writeln(res.toString());	
    shell.popd();
    if (res.status > 0) {
      throw new Error('npm failed with code of ' + res.status);
    }
    
    // For each build task copy the node_modules
    this.data.tasksToLink.forEach(function(taskName) {
        shell.cp('-R', node_modulesPath, path.join(this.data.buildTasksDir, taskName));
    }, this);
    
    // Remove the _temp folder
    shell.rm('-R', tempPath);
  });
};