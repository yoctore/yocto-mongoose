'use strict';

var logger    = require('yocto-logger');
var _         = require('lodash');
var Q         = require('q');
var Schema    = require('mongoose').Schema;

/**
 * Module déclaration
 */
var modCrypt  = require('../crypto');

/**
 *
 * Manage Crud function for adding model
 *
 * @date : 25/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @param {Object} logger default logger intance
 * @class Crud
 */
function Crud (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger = logger;

  /**
   * Alias object for exclusion process
   *
   * @property alias
   */
  this.alias = {
    create : [ 'insert' ],
    get    : [ 'read' ],
    getOne : [ 'readOne' ],
    delete : [ 'destroy' ],
    update : [ 'modify' ]
  };

  /**
   * Instance of crypto module
   */
  this.crypt = modCrypt(logger);
}

/**
 * Alias method for create method
 *
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.insert = function () {
  // Default instance
  return this.create.apply(this, arguments);
};

/**
 * Alias method for get method
 *
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.read = function () {
  // Default instance
  return this.get.apply(this, arguments);
};

/**
 * Alias method for getOne method
 *
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.readOne = function () {
  // Default instance
  return this.getOne.apply(this, arguments);
};

/**
 * Alias method for update method
 *
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.modify = function () {
  // Default instance
  return this.update.apply(this, arguments);
};

/**
 * Alias method for delete method
 *
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.destroy = function () {
  // Default instance
  return this.delete.apply(this, arguments);
};

/**
 * Get One item from given rules
 *
 * @param {String|Object} conditions conditions to use for search
 * @param {String|Object} filter filter to use to process filter
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.getOne = function (conditions, filter) {
  // Call main get function
  return this.get(conditions, filter, 'findOne');
};

/**
 * Get data from a model
 *
 * @param {Object|String} conditions query rules to add in find
 * @param {Object} filter object property to process filter action
 * @param {String} method id a method name is ginve force method name usage
 * @return {Promise} promise object to use for handleling
 */
Crud.prototype.get = function (conditions, filter, method) {
  // Process redis usage
  var redis = this[method === 'findOne' ? 'getOneRedis' : 'getRedis'];

  // Defined default method name to use
  method = _.isString(method) && !_.isEmpty(method) ? method : 'find';

  // Is string ? so if for findById request. change method name
  method = _.isString(conditions) ? 'findById' : method;

  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();

  // Normalize filter object
  filter = _.isString(filter) && !_.isEmpty(filter) ? filter : '';

  // Save context for possible strict violation
  var context = this;

  /**
   * Default method to retreive data
   *
   * @param {Object|String} conditions query rules to add in find
   * @param {Object} filter object property to process filter action
   * @param {Object} store default store rule
   */
  function defaultFind (conditions, filter, store) {
    // Try to call crypto process for nested object where property is not catched by mongoose setter only if is an object
    if (_.isPlainObject(conditions)) {
      // Update conditions format
      conditions = context.crypto().prepareCryptQuery(conditions, context.getProperties());
    }

    // Normal process
    context[method](conditions, filter, function (error, data) {
      // Has error ?
      if (error) {
        // Reject
        deferred.reject(error);
      } else {
        // In case of no data
        if (_.isObject(store)) {
          // Store data on db
          redis.instance.add(store.key, data, store.expire);

          // Do not process promise catch here beacause this process must not stop normal process
          // in any case
        }

        // Valid
        deferred.resolve(data);
      }
    });
  }

  // Has redis ?
  if (redis) {
    // Normalize redisKey
    var redisKey = _.merge(_.isString(conditions) ?
      _.set([ this.modelName, conditions ].join('-'), conditions) : conditions || {}, filter || {});

    // Get key
    redis.instance.get(redisKey).then(function (success) {
      // Success resolve
      deferred.resolve(success);
    }).catch(function (error) {
      // Normal stuff
      defaultFind.call(this, conditions, filter, _.isNull(error) ? {
        key    : redisKey,
        expire : redis.expire
      } : error);
    }.bind(this));
  } else {
    // Normal process
    defaultFind.call(this, conditions, filter);
  }

  // Return deferred promise
  return deferred.promise;
};

/**
 * Find and Remove a specific model
 *
 * @param {String} id query rules to add in find
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.delete = function (id) {
  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();

  // Is valid type ?
  if (_.isString(id) && !_.isEmpty(id)) {
    // Try to find
    this.findByIdAndRemove(id, function (error, data) {
      // Has error ?
      if (error) {
        // Reject
        deferred.reject(error);
      } else {
        // Valid
        deferred.resolve(data);
      }
    });
  } else {
    // Reject
    deferred.reject([ 'Given id is not a string',
      _.isString(id) && _.isEmpty(id) ? ' and is empty' : '' ].join(' '));
  }

  // Return deferred promise
  return deferred.promise;
};

/**
 * Find a model and update it
 *
 * @param {Object|String} conditions query rules to add in find
 * @param {String} update data to use for update
 * @param {Boolean} multi set to true to process to un multi update action
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.update = function (conditions, update, multi) {
  // Is string ? so if for findByIdAndUpdate request. change method name
  var method = _.isString(conditions) ? 'findByIdAndUpdate' : 'findOneAndUpdate';

  // Try to prepare query if is an object
  if (_.isPlainObject(update) || _.isPlainObject(conditions)) {
    // Prepare update property
    update = this.crypto().prepareCryptQuery(update, this.getProperties());

    // Prepare update property
    conditions = this.crypto().prepareCryptQuery(conditions, this.getProperties());
  }

  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();

  // Is multi request ??
  if (_.isBoolean(multi) && multi) {
    // Process specific where
    this.where().setOptions({
      multi : true
    }).update(conditions, update, function (error, data) {
      // Has error ?
      if (error) {
        // Reject
        deferred.reject(error);
      } else {
        // Valid
        deferred.resolve(data);
      }
    });
  } else {
    // Try to find
    this[method](conditions, update, {
      new : true
    }, function (error, data) {
      // Has error ?
      if (error) {
        // Reject
        deferred.reject(error);
      } else {
        // Valid
        deferred.resolve(data);
      }
    });
  }

  // Return deferred promise
  return deferred.promise;
};

/**
 * Insert new data in bdd for current model
 *
 * @param {Object} value value to use for create action
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.create = function (value) {
  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();

  // Create default instance model
  var model = !_.isFunction(this.save) ? new this() : this;

  // Default status
  var status = true;
  var errors = [];

  // Has a validate function ?
  if (_.isFunction(this.validate)) {
    // So try to validate
    status = this.validate(value);

    // Save error
    errors = status.error;

    // Change value here if validate is was call
    value = _.has(status, 'value') ? status.value : value;

    // Get status
    status = _.isNull(status.error);
  }

  // Is valid ?
  if (status) {
    // Model is a valid instance ?
    if (model instanceof this) {
      // Extend data before save
      _.extend(model, value);

      // Try to find
      model.save(function (error, data) {
        // Has error ?
        if (error) {
          // Reject
          deferred.reject(error);
        } else {
          // Elastic is enable on schema ?
          if (this.schema.elastic) {
            // Add this a listener to log indexes action
            model.on('es-indexed', function (err) {
              // Log succes message
              if (err) {
                // Reject with error message
                deferred.reject([ '[ Crud.create ] - Indexes creation failed :', err ].join(' '));
              } else {
                // Resolve default statement
                deferred.resolve(data);
              }
            });
          } else {
            // Valid
            deferred.resolve(data);
          }
        }
      }.bind(this));
    } else {
      // Reject invalid instance model
      deferred.reject('[ Crud.create ] - Cannot save. invalid instance model');
    }
  } else {
    // Reject schema validation error
    deferred.reject([ '[ Crud.create ] - Cannot save new schema.',
      errors ].join(' '));
  }

  // Return deferred promise
  return deferred.promise;
};

/**
 * An utility method to use for search request to elastic search instances
 *
 * @param {Object} query query to use on elastic search request
 * @param {Object} options Optional options, eg. : hydrate, from, size
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.esearch = function (query, options) {
  // Create our deferred object, which we will use in our promise chain
  var deferred    = Q.defer();

  // Elastic is enabled ?
  if (!_.isUndefined(this.search) && _.isFunction(this.search)) {
    // Try to find
    this.search(query || {}, options || {}, function (error, data) {
      // Has error ?
      if (error) {
        // Reject
        deferred.reject(error);
      } else {
        // Valid
        deferred.resolve(data);
      }
    });
  } else {
    // Reject with error message
    deferred.reject('Elastic search is not enabled. Cannot process a search request');
  }

  // Return deferred promise
  return deferred.promise;
};

/**
 * Add a crud method to statics givent schema
 *
 * @param {Object} schema default schema to use
 * @param {Array} exclude array of method to exclude
 * @param {Object} redisIncludes default redis include config retreive form model definition
 * @param {Object} redis current redis instance to use on current crud method
 * @return {Object|Boolean} modified schema with new requested method
 */
Crud.prototype.add = function (schema, exclude, redisIncludes, redis) {
  // Valid data ?
  if (!_.isObject(schema) && !(schema instanceof Schema) || !_.isArray(exclude)) {
    this.logger.warning('[ Crud.add ] - Schema or exclude item given is invalid');

    // Invalid statement
    return false;
  }

  // Default difference
  var difference = [ 'add' ];

  // Elastic is disable ?
  if (!schema.elastic) {
    // Add search method to diff to remove default crud method
    difference.push('elasticsearch');
  }

  // Keep only correct method
  var existing  = _.difference(Object.keys(Crud.prototype), difference);

  // Normalize data

  exclude = _.isArray(exclude) ? exclude : [];

  // Try to add alias on exclude array
  if (!_.isEmpty(exclude) && _.isArray(exclude)) {
    // Build excluded alias
    var excludeAlias = _.intersection(Object.keys(this.alias), exclude);

    // Parse alias to add item

    _.each(excludeAlias, function (ex) {
      // Push it
      exclude.push(this.alias[ex]);
    }.bind(this));

    // Flatten array to have unique level
    exclude = _.flatten(exclude);
  }

  // Keep only needed methods
  var saved     = _.difference(existing, exclude);

  // Parse all
  _.each(saved, function (s) {
    // Is a valid func ?
    if (_.isFunction(this[s])) {
      // Has redis config define ?
      if (redisIncludes) {
        // Current method is include on redis config ?
        if (_.includes(redisIncludes.value || [], s)) {
          // Assign method via static method and bind of redis on it
          schema.static([ s, 'Redis' ].join(''), {
            instance : redis,
            expire   : redisIncludes.expire || 0
          });
        }
      }

      // Assign method via static method
      schema.static(s, this[s]);
    }
  }.bind(this));

  // Default statement
  return schema;
};

// Default export
module.exports = function (l) {
  // Is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Crud.constructor ] - Invalid logger given. Use internal logger');

    // Assign
    l = logger;
  }

  // Default statement
  return new Crud(l);
};
