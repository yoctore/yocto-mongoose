'use strict';

var glob      = require('glob');
var logger    = require('yocto-logger');
var _         = require('lodash');
var Schema    = require('mongoose').Schema;
var joi       = require('joi');

/**
 *
 * Manage all validator action from a valid given schema
 *
 * @date : 25/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @class Validator
 */
function Validator (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger     = logger;
}

/**
 * Add a validator on given schema
 *
 * @param {Object} schema schema to use for method adding
 * @param {String} path path to use for validator loading
 * @param {String} name validator name to use for matching
 * @return {Boolean|Object} new schema if all is ok false othewise
 */
Validator.prototype.add = function (schema, path, name) {
  // valid params first
  if (_.isString(path) && _.isString(name) && !_.isEmpty(path) && !_.isEmpty(name) &&
     _.isObject(schema) && (schema instanceof Schema)) {
    // retrieving files
    var files = glob.sync('**/*.js', { cwd : path, realpath : true });

    // so isEmpty ?
    if (files.length > 0) {
      _.each(files, function (f) {
        // evaluate file
        var fo = require(f);

        // has wanted validator ?
        if (_.has(fo, name) && _.isFunction(fo[name])) {
          this.logger.debug([ '[ Validator.add ] - [', name,
                             '] validator was founded.',
                             'Adding a new validate function on static property',
                             'for given schema' ].join(' '));
          // adding on static method
          schema.static('validate', function (data) {
            // get rules for validation
            var rules = fo[name]();
            // default statement
            return joi.validate(data, rules);
          });
        }
      }, this);

      // valid statement
      return schema;
    }

    // empty files so message
    this.logger.warning([ '[ Validator.add ] - Given directory path for',
                          'Validators seems to be empty.',
                          'Cannot add validator on schema.' ].join(' '));
  } else {
    // cannot process
    this.logger.error([ '[ Validator.add ] - cannot process invalid path / name',
                        '/ model name or schema given.' ].join(' '));
  }

  // invalid statement
  return false;
};

// Default export
module.exports = function (l) {
  // is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Validator.constructor ] - Invalid logger given. Use internal logger');
    // assign
    l = logger;
  }
  // default statement
  return new (Validator)(l);
};
