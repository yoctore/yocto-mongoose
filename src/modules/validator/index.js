'use strict';

var glob      = require('glob');
var logger    = require('yocto-logger');
var _         = require('lodash');
var Schema    = require('mongoose').Schema;
var joi       = require('joi');

/**
 * Manage all validator action from a valid given schema
 *
 * @date : 25/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @param {Object} logger default logger instance
 * @class Validator
 */
function Validator (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger = logger;
}

/**
 * Add a validator on given schema
 *
 * @param {Object} schema schema to use for method adding
 * @param {String} path path to use for validator loading
 * @param {String} name validator name to use for matching
 * @param {String} modelName model name for file matching
 * @return {Boolean|Object} new schema if all is ok false othewise
 */
Validator.prototype.add = function (schema, path, name, modelName) {
  // Valid params first
  if (_.isString(path) && _.isString(name) && !_.isEmpty(path) && !_.isEmpty(name) &&
     _.isObject(schema) && schema instanceof Schema &&
     _.isString(modelName) && !_.isEmpty(modelName)) {
    // Retrieving files
    var files = glob.sync([ '**/', modelName, '.js' ].join(''), {
      cwd      : path,
      realpath : true,
      nocase   : true
    });

    // So isEmpty ?
    if (files.length > 0) {
      // Parse all items
      _.each(files, function (f) {
        // Evaluate file
        var fo = require(f);

        // Has wanted validator ?
        if (_.has(fo, name) && _.isFunction(fo[name])) {
          this.logger.debug([ '[ Validator.add ] - [', name,
            '] validator was founded.',
            'Adding a new validate function on static property',
            'for given schema' ].join(' '));

          // Adding a validate static method
          schema.static('validate', function (data) {
            // Get rules for validation
            // we add reference of enums instance automaticly in validator function param
            var rules = fo[name](this.enums);

            // Default statement

            return joi.validate(data, rules);
          });

          // Adding a get validate schema static method
          schema.static('getValidateSchema', function () {
            // Get rules for validation
            // we add reference of enums instance automaticly in validator function param
            return fo[name](this.enums);
          });
        }
      }.bind(this));

      // Valid statement
      return schema;
    }

    // Empty files so message
    this.logger.warning([ '[ Validator.add ] - Given directory path for',
      'Validators seems to be empty.',
      'Cannot add validator on schema.' ].join(' '));
  } else {
    // Cannot process
    this.logger.error([ '[ Validator.add ] - cannot process invalid path / name',
      '/ model name or schema given.' ].join(' '));
  }

  // Invalid statement
  return false;
};

// Default export
module.exports = function (l) {
  // Is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Validator.constructor ] - Invalid logger given. Use internal logger');

    // Assign
    l = logger;
  }

  // Default statement
  return new Validator(l);
};
