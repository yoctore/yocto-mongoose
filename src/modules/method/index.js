'use strict';

var glob        = require('glob');
var logger      = require('yocto-logger');
var _           = require('lodash');
var Schema      = require('mongoose').Schema;
var joi         = require('joi');
var utils       = require('yocto-utils');
var stackTrace  = require('stack-trace');

/**
 *
 * Manage all Method action from a valid given schema
 *
 * @date : 25/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 * @param {Object} logger Yocto Logger instance
 * @class Method
 */
function Method (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger = logger;
}

/**
 * Add a method on given schema
 *
 * @param {Object} schema schema to use for method adding
 * @param {String} path path to use for validator loading
 * @param {String} items item list to use for matching
 * @param {String} modelName model name for file matching
 * @param {Object} redis current redis instance to use on define method
 * @return {Boolean|Object} new schema if all is ok false othewise
 */
Method.prototype.add = function (schema, path, items, modelName, redis) {
  // Valid params first
  if (_.isString(path) && _.isArray(items) && !_.isEmpty(path) && !_.isEmpty(items) &&
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
      // Parse all files
      _.each(files, function (f) {
        // Evaluate file
        var fo = require(f);

        // Parse each item
        _.each(items, function (item) {
          // Define schema
          var vschema = joi.object().keys({
            type  : joi.string().required().empty().valid([ 'static', 'method', 'post', 'pre' ]),
            name  : joi.string().required().empty(),
            event : joi.optional().when('type', {
              is   : 'post',
              then : joi.string().required().empty().valid([
                'init',
                'validate',
                'save',
                'remove',
                'count',
                'find',
                'findOne',
                'findOneAndRemove',
                'findOneAndUpdate',
                'update'
              ])
            }),
            redis : joi.object().optional().keys({
              enable : joi.boolean().required().default(false),
              expire : joi.number().optional().min(0).default(0)
            })
          });

          // Validate schema
          var validate = joi.validate(item, vschema);

          // Has error ?
          if (_.isNull(validate.error)) {
            // Has wanted validator ?
            if (_.has(fo, item.name) && _.isFunction(fo[item.name])) {
              // Debug message
              this.logger.debug([ '[ Method.add ] - Method [', item.name,
                '] founded adding new',
                item.type === 'method' ? 'instance' :
                  item.type, 'method for given schema' ].join(' '));

              // Is post item
              if ((item.type === 'post' || item.type === 'pre') &&
                _.isString(item.event) && !_.isEmpty(item.event)) {
                // Debug message
                this.logger.debug([ '[ Method.add ] - Adding [', item.type,
                  ' ] hook on current schema for event [', item.event, ']' ].join(' '));

                // Save logger to send to external method
                var logger = this.logger;

                // Build post process with needed event

                if (item.type === 'post') {
                  // Build post process
                  schema.post(item.event, function () {
                    // Default statement process function with given arguments in current context
                    return fo[item.name].apply(this, _.flatten([ arguments, logger ]));
                  });
                } else {
                  console.log('\n item : ', item)

                  // Build pre process
                  schema.pre(item.event, function () {
                    // Default call process function with given arguments in current context
                    return fo[item.name].apply(this, _.flatten([ arguments, logger ]));

                    // Default statement
                    // return next();
                  });
                }
              } else {
                // Define method
                schema[item.type](item.name, function () {
                  // Default statement process function with given arguments in current context
                  return fo[item.name].apply(this, arguments);
                });
              }

              // Has redis ?
              if (item.redis) {
                // Has custom redis expire time define on schema for specific key/method ?
                if (!_.isArray(schema.redisExpireTimeByKey)) {
                  // Create default item
                  schema.redisExpireTimeByKey = [];
                }

                // Is enable ?
                if (_.has(item.redis, 'enable') && item.redis.enable) {
                  // Push item on schema mapping for specific expire time
                  schema.redisExpireTimeByKey.push(_.set({}, item.name, item.redis.expire));

                  // Define static
                  schema.static('redis', function () {
                    // Current stack trace to find correct key for redi
                    var stack   = stackTrace.get();

                    // Get caller properly
                    var caller  = stack[1];

                    // If correct object

                    if (_.isObject(caller)) {
                      // Set caller
                      caller = caller.getFunctionName();

                      // Replace exports call
                      caller = caller.replace('exports.', '');
                    }

                    // Get expire
                    var expire = _.result(_.find(this.schema.redisExpireTimeByKey, caller),
                      caller);

                    // Here default statement. we return current instance of redis and
                    // default expire time to use custom redis usage

                    return {
                      instance : redis,
                      expire   : expire || 0
                    };
                  });
                }
              }
            } else {
              // Warning message
              this.logger.warning([ '[ Method.add ] - Cannot found method [',
                item.name, '] for current model'
              ].join(' '));
            }
          } else {
            // Error schema is invalid
            this.logger.error([ '[ Method.add ] - Cannot add method for item',
              utils.obj.inspect(item), validate.error ].join(' '));
          }
        }.bind(this));
      }.bind(this));

      // Valid statement
      return schema;
    }

    // Empty files so message
    this.logger.warning([ '[ Method.add ] - Given directory path for',
      'Methods seems to be empty.',
      'Cannot add method on schema.' ].join(' '));
  } else {
    // Cannot process
    this.logger.error('[ Method.add ] - cannot process invalid path / name or schema given.');
  }

  // Invalid statement
  return false;
};

// Default export
module.exports = function (l) {
  // Is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Method.constructor ] - Invalid logger given. Use internal logger');

    // Assign
    l = logger;
  }

  // Default statement
  return new Method(l);
};
