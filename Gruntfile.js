'use strict';

module.exports = function (grunt) {
  // Init config
  grunt.initConfig({
    // Default package
    pkg  : grunt.file.readJSON('package.json'),
    date : new Date(),

    // Hint our app
    yoctohint : {
      json : [
        'package.json'
      ],
      node : [
        'Gruntfile.js', 'src/*/*'
      ],
      options : {
        compatibility : true
      }
    },

    // Uglify our app
    uglify : {
      options : {
        banner : [
          '/* <%= pkg.name %>',
          '<%= pkg.description %>',
          'V<%= pkg.version %>',
          '<%= date %>*/\n' ].join(' - ')
      },
      api : {
        files : [ {
          expand : true,
          cwd    : 'src',
          src    : '**/*.js',
          dest   : 'dist'
        } ]
      }
    },

    // Test our app
    mochacli : {
      options : {
        reporter       : 'spec',
        'inline-diffs' : false,
        'no-exit'      : true,
        force          : false,
        'check-leaks'  : true,
        bail           : false
      },
      all : [ 'tests/unit/*.js' ]
    },
    mochaTest : {
      unit : {
        options : {
          reporter          : 'spec',
          quiet             : false,
          clearRequireCache : false,
          noFail            : false
        },
        src : [ 'test/*.js' ]
      }
    },
    yoctodoc : {
      options : {
        destination : './docs'
      },
      all : [ 'src/***.js' ]
    }
  });

  // Load tasks
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('yocto-hint');
  grunt.loadNpmTasks('yocto-doc');

  // Register tasks
  grunt.registerTask('hint', [ 'yoctohint' ]);
  grunt.registerTask('test', 'mochaTest');
  grunt.registerTask('build', [ 'yoctohint', 'uglify' ]);
  grunt.registerTask('doc', [ 'yoctodoc' ]);
  grunt.registerTask('default', [ 'build', 'doc', 'test' ]);
};
