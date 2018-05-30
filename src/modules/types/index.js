'use strict';

var async = require('async');
var glob        = require('glob');
var logger = require('yocto-logger');
var _      = require('lodash');
var path   = require('path');
var Q      = require('q');

/**
 * Types module
 *
 * @param       {Object} logger   Logger instance
 * @param       {Object} mongoose Mongoose instace
 * @constructor
 */
function Types (logger, mongoose) {
  this.mongoose = mongoose;
  this.logger = logger;
}

/**
 * Load all custom types that exist in types folder
 *
 * @param {Object} modules Modules
 * @return {Object} Result of promise
 */
Types.prototype.load = function (modules) {
  // Controlf flow
  var deferred = Q.defer();

  // Retreive path of All specific types in default folder
  var types = glob.sync('types/*.js', {
    cwd : __dirname
  });

  // Check if found
  if (_.isEmpty(types)) {
    // Not found
    this.logger.info('[ Types.load ] - no custom Types found');

    // Resolve because nothing to process
    deferred.resolve();

    // Return deferred promise
    return deferred.promise;
  }

  // Load each Types
  async.each(types, function (pathType, nextType) {
    // Try process for error handling
    try {
      var typeName = path.basename(pathType, '.js');

      this.logger.info('[ Types.load ] - Load custom Types : ' + typeName);

      // Retrieve Types
      var t = require('./' + pathType)(modules);

      // Set Type into mongooseTypes
      _.set(this.mongoose.Schema.Types, typeName, t);

      // Next type
      this.logger.debug('[ Types.load ] - custom Types added : ' + typeName);
      nextType();
    } catch (error) {
      // Break async
      this.logger.error('[ Types.load ] - Error when load custom Types at path ' + pathType +
      ', details : ', error);
      nextType(error);
    }
  }.bind(this), function (error) {
    // Check error
    if (error) {
      // Reject error
      return deferred.reject(error);
    }

    // No error
    return deferred.resolve();
  });

  // Return deferred promise
  return deferred.promise;
};

// Default export
module.exports = function (yLogger, mongoose) {
  // Is a valid logger ?
  if (_.isUndefined(yLogger) || _.isNull(yLogger)) {
    logger.warning('[ Types.constructor ] - Invalid logger given. Use internal logger');

    // Assign
    yLogger = logger;
  }

  // Default statement
  return new Types(yLogger, mongoose);
};
