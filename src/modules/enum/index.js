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
 * @class Enums
 */
function Enums (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger     = logger;

  /**
   * Enums list item
   *
   * @property enums
   */
  this.enums      = [];
}

/**
 * Load enums value from given path
 *
 * @param {String} path given path to retreive model
 * @return {Boolean} true if load is ok false otherwise
 */
Enums.prototype.load = function (path) {
  try {
    // test is a valid path
    if (!_.isString(path) || _.isEmpty(path)) {
      throw 'Invalid path given.';
    }

    // validation schema
    var schema = joi.array().items(
      joi.object().required().keys({
        name  : joi.string().required().empty(''),
        value : joi.array().required().min(1)
      })
    );

    // check model definition & controller first
    var enums = glob.sync('**/*.json', {
      cwd       : path,
      realpath  : true
    });

    // read each file
    _.each(enums, function (m) {
      // load
      var data = JSON.parse(fs.readFileSync(m, 'utf-8'));

      // validate format
      var state = joi.validate(data, schema);

      // is valid format
      if (_.isNull(state.error)) {
        // push
        this.enums.push(state.value);
      } else {
        // invalid warning message
        this.logger.warning([ '[ Enums.load.parse ] -  Cannot load item for [', m, ']',
                              state.error ].join(' '));
      }
    }.bind(this));

    // flatten
    this.enums  = _.uniq(_.flatten(this.enums), 'name');
  } catch (e) {
    // warning message
    this.logger.error([ '[ Enums.load ] - Cannot load path from given enum path.', e ].join(' '));
    // invalid statement
    return false;
  }

  // default statement
  return true;
};

/**
 * Default get function to retreive a enums list from given name
 *
 * @param {String} name name to use to find enum list
 * @return {Array} enum array list
 */
Enums.prototype.get = function (name) {
  // is a valid string ?
  if (_.isString(name) && !_.isEmpty(name)) {
    // data is ok so try to get enums from given name
    if (_.isArray(this.enums) && !_.isEmpty(this.enums)) {
      // a valid statement or empty array if is not founded
      return _.result(_.find(this.enums, 'name', name), 'value') || [];
    } else {
      // warning message
      this.logger.warning('[ Enums.get ] - enums list is empty. try to load enums before get');
    }
  } else {
    // warning message
    this.logger.warning('[ Enums.get ] - given name is empty or not a string.');
  }

  // default statement
  return [];
};

// Default export
module.exports = function (l) {
  // is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Enums.constructor ] - Invalid logger given. Use internal logger');
    // assign
    l = logger;
  }
  // default statement
  return new (Enums)(l);
};
