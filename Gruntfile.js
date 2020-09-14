var matchDep = require('matchdep');

module.exports = function (grunt) {
  matchDep.filterDev('grunt-*').forEach(grunt.loadNpmTasks);
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    terser: {
      build: {
        options: {
          parse: {
            ecma: 5
          }
        },
        files: {
          'build/index.js': ['./js/index.js']
        }
      }
    },
    uncss: {
      build: {
        options: {
          report: 'min',
          ignore: ['.forecast-day', '.current-city']
        },
        files: {
          'build/styles.css': ['./index.html']
        }
      }
    },
    cssmin: {
      build: {
        files: [
          { src: 'build/styles.css', dest: 'build/styles.css' }
        ]
      }
    },
    inline: {
      dist: {
        src: 'build/index.html',
        dest: 'build/index.html'
      }
    },
    processhtml: {
      options: {
        data: {
          message: 'Hello world!'
        }
      },
      dist: {
        files: {
          'build/index.html': ['./index.html']
        }
      }
    },
    copy: {
      target: {
        files: [
          {expand: true, src: ['images/**'], dest: 'build/images'}
        ]
      }
    }
  });

  grunt.registerTask('default', ['terser', 'uncss', 'cssmin', 'processhtml', 'inline', 'copy']);
};
