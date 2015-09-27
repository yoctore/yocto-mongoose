var utils     = require('yocto-utils');
var logger    = require('yocto-logger');
var mongoose  = require('mongoose');
var _         = require('lodash');
var Promise   = require('promise');
var path      = require('path');
var fs        = require('fs');
var glob      = require('glob');
var joi       = require('joi');
var async     = require('async');
var Q         = require('q');
var Schema    = require('mongoose').Schema;

/**
 *
 * Manage Crud function for adding model
 *
 * @date : 25/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @class Crud
 */
function Crud (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger     = logger;
}

/**
 * Get One item from given rules
 *
 * @param {String|Object} conditions conditions to use for search
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.getOne = function (conditions) {
  // call main function
  return this.get(conditions, 'findOne');
};

/**
 * Get data from a model
 *
 * @param {Object|String} conditions query rules to add in find
 * @param {String} method id a method name is ginve force method name usage
 * @return {Promise} promise object to use for handleling
 */
Crud.prototype.get = function (conditions, method) {
  // defined default method name to use
  method = _.isString(method) && !_.isEmpty(method) ? method : 'find';

  // is string ? so if for findById request. change method name
  method = _.isString(conditions) ? 'findById' : method;

  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();

  // try to find
  this[method](conditions, function (error, data) {
    if (error) {
      // reject
      deferred.reject(error);
    } else {
      // valid
      deferred.resolve(data);
    }
  });

  // return deferred promise
  return deferred.promise;
};

/**
 * Find and Remove a specific model 
 *
 * @param {String} rules query rules to add in find
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.delete = function (id) {
  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();
  
  // is valid type ?
  if (_.isString(id) && !_.isEmpty(id)) {
    // try to find
    this.findByIdAndRemove(id, function (error, data) {
      // has error ?
      if (error) {
        // reject
        deferred.reject(error);
      } else {
        // valid
        deferred.resolve(data);
      }
    });    
  } else {
    deferred.reject( [ 'Given id is not a string',
                      _.isString(id) && _.isEmpty(id) ? ' and is empty' : '' ].join(' '));
  }

  // return deferred promise
  return deferred.promise;
};

/**
 * Find a model and update it
 *
 * @param {Object|String} conditions query rules to add in find
 * @param {String} update data to use for update
 * @return {Promise} promise object to use for handling
 */
Crud.prototype.update = function(conditions, update) {
  // is string ? so if for findByIdAndUpdate request. change method name
  var method = _.isString(conditions) ? 'findByIdAndUpdate' : 'findOneAndUpdate';
  
  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();

  // try to find
  this[method](conditions, update, { new : true }, function (error, data) {
    // has error ?
    if (error) {
      // reject
      deferred.reject(error);
    } else {
      // valid
      deferred.resolve(data);
    }
  });

  // return deferred promise
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
  // create default instance model
  var model = !_.isFunction(this.save) ? new this() : this;
  
  // model is a valid instance ?
  if (model instanceof this) {
    // merge data before save
    _.merge(model, value);
  
    // try to find
    model.save(function (error, data) {
      // has error ?
      if (error) {
        // reject
        deferred.reject(error);
      } else {
        // valid
        deferred.resolve(data);
      }
    });
  } else {
    // reject invalid instance model
    deferred.reject('[ Crud.create ] - cannot save. invalid instance model');
  }

  // return deferred promise
  return deferred.promise;
};

/**
 * Add a crud method to statics givent schema
 *
 * @param {Object} schema default schema to use
 * @param {Array} exclude array of method to exclude
 * @return {Object} modified schema with new requested method
 */
Crud.prototype.add = function (schema, exclude) {
  // valid data ?
  if ((!_.isObject(schema) && !(scheme instanceof Schema)) || !_.isArray(exclude)) {
    this.logger.warning('[ Crud.add ] - Schema or exclude item given is invalid');
    // invalid statement
    return false;
  }

  // keep only correct method
  var existing  = _.difference(Object.keys(Crud.prototype), [ 'add' ]);
  // normalize data
  exclude       = _.isArray(exclude) ? exclude : [];
  // keep only needed methods
  var saved     = _.difference(existing, exclude);

  // current context
  var context = this;

  // parse all
  _.each(saved, function (s) {
    // is a valid func ?
    if (_.isFunction(context[s])) {
      // assign method via static method
      schema.static(s, context[s]);
    }
  });

  // default statement
  return schema;
};

// Default export
module.exports = function (l) {
  // is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Crud.add ] - Invalid logger given. Use internal logger');
    // assign
    l = logger; 
  }
  // default statement
  return new (Crud)(l);
};