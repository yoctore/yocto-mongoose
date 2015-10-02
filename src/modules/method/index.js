'use strict';

var glob      = require('glob');
var logger    = require('yocto-logger');
var _         = require('lodash');
var Schema    = require('mongoose').Schema;
var joi       = require('joi');
var utils     = require('yocto-utils');

/**
 *
 * Manage all Method action from a valid given schema
 *
 * @date : 25/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @class Method
 */
function Method (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger     = logger;
}

/**
 * Add a method on given schema
 *
 * @param {Object} schema schema to use for method adding
 * @param {String} path path to use for validator loading
 * @param {String} items item list to use for matching
 * @return {Boolean|Object} new schema if all is ok false othewise
 */
Method.prototype.add = function (schema, path, items) {
  // valid params first
  if (_.isString(path) && _.isArray(items) && !_.isEmpty(path) && !_.isEmpty(items) &&
     _.isObject(schema) && (schema instanceof Schema)) {
    // retrieving files
    var files = glob.sync('**/*.js', { cwd : path, realpath : true });

    // so isEmpty ?
    if (files.length > 0) {
      _.each(files, function (f) {
        // evaluate file
        var fo = require(f);

        // parse each item
        _.each(items, function (item) {

          // define schema
          var vschema = joi.object().keys({
            type : joi.string().required().empty().allow([ 'static', 'method' ]),
            name : joi.string().required().empty()
          });

          // validate schema
          var validate = joi.validate(item, vschema);

          // has error ?
          if (_.isNull(validate.error)) {
            // has wanted validator ?
            if (_.has(fo, item.name) && _.isFunction(fo[item.name])) {
              this.logger.debug([ '[ Method.add ] - Method [', item.name,
                                 '] founded adding new',
                                 (item.type === 'method' ? 'instance' : item.type),
                                 'method for given schema' ].join(' '));
              // define method
              schema[item.type](item.name, function () {
                // default statement process function with given arguments in current context
                return fo[item.name].apply(this, arguments);
              });
            }
          } else {
            // error schema is invalid
            this.logger.error([ '[ Method.add ] - Cannot add method for item',
                                utils.obj.inspect(item), validate.error ].join(' '));
          }
        }, this);
      }, this);

      // valid statement
      return schema;
    }

    // empty files so message
    this.logger.warning([ '[ Method.add ] - Given directory path for',
                          'Methods seems to be empty.',
                          'Cannot add method on schema.' ].join(' '));
  } else {
    // cannot process
    this.logger.error('[ Method.add ] - cannot process invalid path / name or schema given.');
  }

  // invalid statement
  return false;
};

// Default export
module.exports = function (l) {
  // is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Method.constructor ] - Invalid logger given. Use internal logger');
    // assign
    l = logger;
  }
  // default statement
  return new (Method)(l);
};
