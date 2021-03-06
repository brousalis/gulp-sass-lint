//////////////////////////////
// Sass Lint
//  - A Gulp Plugin
//
// Lints Sass files
//////////////////////////////

'use strict';

//////////////////////////////
// Variables
//////////////////////////////

var through = require('through2'),
    gutil = require('gulp-util'),
    lint = require('sass-lint'),
    path = require('path'),
    PluginError = gutil.PluginError,
    PLUGIN_NAME = 'sass-lint';

//////////////////////////////
// Export
//////////////////////////////

var sassLint = function (options) {
  var userOptions = options || {};
  var configFile = userOptions.configFile;

  var compile = through.obj(function (file, encoding, cb) {
    var config;
    if (file.isNull()) {
      return cb();
    }
    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
      return cb();
    }

    // load our config from sassLint and the user provided options if available
    config = lint.getConfig(userOptions, configFile);
    // save the config file within the file object for access when this file is piped around
    file.userOptions = userOptions;
    file.configFile = configFile;

    // lint the file and pass the user defined options and config path to sass lint to handle
    try {
      file.sassLint = [
        lint.lintFileText({
          'text': file.contents,
          'format': path.extname(file.path).replace('.', ''),
          'filename': path.relative(process.cwd(), file.path)
        }, userOptions, configFile)];
    } catch(e) {
      this.emit('error', new PluginError(PLUGIN_NAME, e.message));
    }

    this.push(file);
    cb();
  });
  return compile;
}

sassLint.format = function () {
  var compile = through.obj(function (file, encoding, cb) {
    if (file.isNull()) {
      return cb();
    }
    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
      return cb();
    }

    lint.outputResults(file.sassLint, file.sassConfig);

    this.push(file);
    cb();
  });
  return compile;
}

sassLint.failOnError = function (failCb) {
  var filesWithErrors = [];
  var compile = through({objectMode: true}, function (file, encoding, cb) {
    if (file.isNull()) {
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
      return cb();
    }

    if (file.sassLint[0].errorCount > 0) {
      filesWithErrors.push(file);
    }

    this.push(file);
    cb();
  }, function (cb) {
    var errorMessage;

    if (filesWithErrors.length > 0) {
      errorMessage = filesWithErrors.map(function (file) {
        return file.sassLint[0].errorCount + ' errors detected in ' + file.relative
      }).join('\n');

      if (failCb !== undefined) {
        failCb(errorMessage);
      } else {
        this.emit('error', new PluginError(PLUGIN_NAME, errorMessage));
      }
    }

    cb();
  });

  return compile;
}

module.exports = sassLint;
