'use strict';

var _       = require('lodash');
var fs      = require('fs');
var glob    = require('glob');
var joi     = require('joi');
var logger  = require('yocto-logger');

/**
 *
 * Manage all enums action from a valid given schema
 *
 * @date : 25/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @param {Object} logger default logger intance
 * @param {Object} mongooseTypes default list of mongoose Types
 * @class Enums
 */
function Enums (logger, mongooseTypes) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger = logger;

  /**
   * Enums list item
   *
   * @property enums
   */
  this.enums = [];

  /**
   * Mongoose type can be useful on enumes block
   */
  this.Types = mongooseTypes;
}

/**
 * Load enums value from given path
 *
 * @param {String} path given path to retreive model
 * @return {Boolean} true if load is ok false otherwise
 */
Enums.prototype.load = function (path) {
  try {
    // Test is a valid path
    if (!_.isString(path) || _.isEmpty(path)) {
      throw 'Invalid path given.';
    }

    // Validation schema
    var schema = joi.array().items(
      joi.object().required().keys({
        name  : joi.string().required().empty(''),
        value : joi.array().required().min(1)
      })
    );

    // Check model definition & controller first
    var enums = glob.sync('**/*.json', {
      cwd      : path,
      realpath : true
    });

    // Read each file
    _.each(enums, function (m) {
      // Load
      var data = JSON.parse(fs.readFileSync(m, 'utf-8'));

      // Validate format
      var state = joi.validate(data, schema);

      // Is valid format
      if (_.isNull(state.error)) {
        // Push
        this.enums.push(state.value);
      } else {
        // Invalid warning message
        this.logger.warning([ '[ Enums.load.parse ] -  Cannot load item for [', m, ']',
          state.error ].join(' '));
      }
    }.bind(this));

    // Flatten
    this.enums = _.uniq(_.flatten(this.enums), 'name');
  } catch (e) {
    // Warning message
    this.logger.error([ '[ Enums.load ] - Cannot load path from given enum path.', e ].join(' '));

    // Invalid statement
    return false;
  }

  // Default statement
  return true;
};

/**
 * Default get function to retreive a enums list from given name
 *
 * @param {String} name name to use to find enum list
 * @return {Array} enum array list
 */
Enums.prototype.get = function (name) {
  // Is a valid string ?
  if (_.isString(name) && !_.isEmpty(name)) {
    // Data is ok so try to get enums from given name
    if (_.isArray(this.enums) && !_.isEmpty(this.enums)) {
      // A valid statement or empty array if is not founded
      return _.result(_.find(this.enums, [ 'name', name ]), 'value') || [];
    }

    // Warning message
    this.logger.warning('[ Enums.get ] - enums list is empty. try to load enums before get');
  } else {
    // Warning message
    this.logger.warning('[ Enums.get ] - given name is empty or not a string.');
  }

  // Default statement
  return [];
};

// Default export
module.exports = function (l, types) {
  // Is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Enums.constructor ] - Invalid logger given. Use internal logger');

    // Assign
    l = logger;
  }

  // Default statement
  return new Enums(l, types);
};
