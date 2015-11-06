var url = require('url');

module.exports = function (grunt) {

  // Caller-provided options  
  var vsoContentHosting = grunt.option('vsoContentHosting') || false;
  var baseUri = grunt.option('baseUri') || 'http://localhost:1111';
  var release = grunt.option('release');
  var publisher = grunt.option('publisher') || 'ms-devlabs';
  
  var manifests = [
    "vss-main-extension.json",
    "vss-vsonline-extension.json",
    "vss-buildtasks-extension.json"
  ];

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-typescript');
  grunt.loadNpmTasks('grunt-contrib-watch');
  
  // Project configuration
  grunt.initConfig({
    dirs: {
      output: {
        packages: "dist/",
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
          src: ['web.config', '**/*.{html,css,png,jpg,js}', '**/Templates/**/Files/**'],
          dest: '<%= dirs.output.web %>'
        },
        {
          expand: true,
          cwd: 'Manifests',
          src: manifests,
          dest: '<%= dirs.output.packages %>'
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
      manifest: '<%= dirs.output.packages %>' + 'vss-main-extension.json',
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
      files: ['Web/**/*.{html,css,png,jpg,js}', 'Web/**/Templates/**/Files/**', 'Manifests/**'],
      tasks: ['copy'],
      options: {
        spawn: false,
      },
    }
  }

  grunt.config('typescript', typeScriptConfig);
  grunt.config('copy', copyConfig);
  grunt.config('prepManifest', prepManifestConfig);
  grunt.config('watch', watchConfig);
    
  // Register build task
  grunt.registerTask('build', ['clean', 'typescript', 'copy']);
  
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
};