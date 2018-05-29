'use strict'

var _       = require('lodash');
var logger  = require('yocto-logger');
var utils   = require('yocto-utils');
var traverse = require('traverse');

/**
 *
 * Provide utility method for encrypt et decrypt actions
 *
 * @date : 20/03/2017
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @param {Object} logger current logger instance
  * @param {Object} mongooseTypes default list of mongoose Types
 * @class Crypt
 */
function Crypt (logger, mongooseTypes) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger = logger;

  /**
   * Default algorithm to use from crypto process
   */
  this.algorithm = 'aes256';

  /**
   * Default hasKey to use for crypp/decrypt process
   */
  this.hashKey = '';

  /**
   * Current mongoose type
   */
  this.Types = mongooseTypes;

  /**
   * Model properties
   */
  this.modelProperties = {};
}

/**
 * Try to encrypt data from given schema
 *
 * @param {Object} data current data to use for crypt action
 * @return {Mixed} Encrypted data
 */
Crypt.prototype.encrypt = function (data) {
  // Only if data is valid
  if (data) {
    // Only if data is not already crypted
    if (!this.isAlreadyCrypted(data)) {
      // Debug message
      this.logger.verbose([ '[ YMongoose.cryto.encrypt ] - Starting encrypt process with algo [',
        this.algorithm, '] for data ', utils.obj.inspect(data)
      ].join(' '));

      // Try to crypt value
      var crypted = utils.crypto.encrypt(this.hashKey, data, this.algorithm);

      // Only if crypted is value

      if (crypted) {
        // Debug message
        this.logger.verbose([ '[ YMongoose.cryto.encrypt ] - Value was successfuly crypted to ',
          utils.obj.inspect(crypted)
        ].join(' '));

        // Default statement in this case
        return crypted;
      }
    }
  }

  // Default statement
  return data;
};

/**
 * Try to decrypt data from given schema
 *
 * @param {Object} data current data to use for decrypt action
 * @return {Mixed} Decrypted data
 */
Crypt.prototype.decrypt = function (data) {
  // Only if data is valid
  if (data) {
    // Debug message
    this.logger.verbose([ '[ YMongoose.cryto.decrypt ] - Starting decrypt process with algo [',
      this.algorithm, '] for data ', utils.obj.inspect(data)
    ].join(' '));

    // Try to crypt value
    var decrypted = utils.crypto.decrypt(this.hashKey, data, this.algorithm);

    // Only if crypted is value

    if (decrypted) {
      // Debug message
      this.logger.verbose([ '[ YMongoose.cryto.decrypt ] - Value is crypted so decrypted value is',
        utils.obj.inspect(decrypted)
      ].join(' '));

      // Default statement in this case
      return decrypted;
    }
  }

  // Default statement
  return data;
};

/**
 * Check if givent value is already crypt or not
 *
 * @param {Object} data current data to check
 * @return {Boolean} true if data is already crypted, false otherwise
 */
Crypt.prototype.isAlreadyCrypted = function (data) {
  // Only if data is valid
  if (data) {
    // Debug message
    this.logger.verbose([ '[ YMongoose.cryto.isAlreadyCrypted ] - Checking if given data [',
      utils.obj.inspect(data),
      '] is already crypted' ].join(' '));

    // Try to crypt value
    var decrypted = utils.crypto.decrypt(this.hashKey, data, this.algorithm);

    // Only if crypted is value

    if (decrypted) {
      // Debug message
      this.logger.verbose([ '[ YMongoose.cryto.isAlreadyCrypted ] - Given data',
        utils.obj.inspect(data), 'is already crypted. Skipping this process !' ].join(' '));

      // Default statement in this case
      return true;
    }
  }

  // Default statement
  return false;
};

/**
 * Save given algorithm key to use on crypto process
 *
 * @param {String} config current algorithm config to use on crypto process
 * @return {Object} current instance of Crypt class
 */
Crypt.prototype.setAlgorithmAndKey = function (config) {
  // Save algorythm value
  this.algorithm = _.get(config, 'hashType') || this.algorithm;

  // Save hash key value
  this.hashKey = _.get(config, 'hashKey') || this.hashKey;

  // Default statement
  return this;
}

/**
 * Check if on defined config we has ym_crypt property defined, to avoid parse process
 * @param {Object} obj properties object to use on process
 * @return {Boolean} true if rules is defined and is required
 */
Crypt.prototype.cryptedRulesIsDefined = function (obj) {
  // Default statement
  return !_.isEmpty(_.compact(_.map(_.compact(_.uniq(_.map(traverse(obj).paths(),
    function (paths) {
    // Contains ym_crypt property ?
      if (_.includes(paths, 'ym_crypt')) {
      // Default statement
        return paths.join('.');
      }

      // Default invalid statement
      return false;
    }))), function (path) {
    // Get state property defined on obj
    var state = _.get(obj, path);

    // Is a boolean and is set to true
    if (_.isBoolean(state) && state) {
      // Return correct path
      return path;
    }

    // Default statement
    return false;
  })));
}

/**
 * Default function to parse and object recursivly to update encryp and decrypt key
 *
 * @param {Object} obj default object to process
 * @return {Object} default object processed
 */
Crypt.prototype.prepare = function (obj) {
  // First test
  if (!obj || !_.isObject(obj)) {
    // Default statement
    return obj;
  }

  // Second test
  if (_.isDate(obj) || _.isRegExp(obj)) {
    return obj;
  }

  // Third test
  if (_.isArray(obj)) {
    // Remap and call recursivly
    return _.map(obj, this.prepare.bind(this));
  }

  // Is Joi object ?
  if (_.has(obj, 'isJoi')) {
    // Default statement in this case
    return obj;
  }

  // Default statement
  return _.reduce(Object.keys(obj), function (acc, key) {
    // Assign
    acc[key] = this.prepare(obj[key]);

    // Do default process to add default setters and getters on model
    acc = this.addDefaultSettersAndGetters(obj, key, acc);

    // Do needed last action for :
    // 1. To avoid missing usage of setrers and getters of mongoose of nested array
    // 2. To avoid missing usage of setters and getters of mongoose of nested object
    acc = this.processAndCheckTypeForSetterAndGetters(obj, key, acc);

    // Return item
    return acc;
  }.bind(this), {});
};

/**
 * Add default setter and getters on property on simple case
 *
 * @param {Object} obj current schema use for parse process
 * @param {String} key current key use on parse process
 * @param {Object} acc current modified schema use for process
 * @return {Mixed} modified object with correct setter and getter
 */
Crypt.prototype.addDefaultSettersAndGetters = function (obj, key, acc) {
  // Has encrypt key and is enable ?
  if (_.has(obj[key], 'ym_crypt')) {
    if (_.get(obj[key], 'ym_crypt')) {
      // Set encrypt process
      _.set(acc[key], 'set', function (value) {
        // Default statement
        return this.encrypt(value);
      }.bind(this));

      // If we set encrypt process set decrypt process
      _.set(acc[key], 'get', function (value) {
        // Default statement
        return this.decrypt(value);

        // Return value;
      }.bind(this));
    }
  }

  // Default statement
  return acc;
}

/**
 * Check current schema and apply correct setter and getters on needed properpty
 * Specificly for nested object and nested array
 *
 * @param {Object} obj current schema use for parse process
 * @param {String} key current key use on parse process
 * @param {Object} acc current modified schema use for process
 * @return {Mixed} modified object with correct setter and getter
 */
Crypt.prototype.processAndCheckTypeForSetterAndGetters = function (obj, key, acc) {
  // We do this for array. Mongoose dont append getters on nested array
  // We need to use your own
  if (_.has(obj[key], 'type')) {
    // Custom process for array on main level
    if (_.isArray(_.get(obj[key], 'type'))) {
      // Defined a getter for array type
      _.set(acc[key], 'get', function (value) {
        // Default statement
        return !_.isUndefined(value) && !_.isEmpty(value) ?
          this.remapNestedArray(value.toObject()) : value;
      }.bind(this));
    } else if (_.isPlainObject(_.get(obj[key], 'type'))) {
      // Build setter and getter
      _.each([ 'set', 'get' ], function (hook) {
        // Defined missing setter on nested object
        _.set(acc[key], hook, function (value) {
          // First we need to check if is a plain object
          if (_.isPlainObject(value)) {
            // Process walk of plain object to process correct encryption
            value = this.walkDeepPlainObject(value, _.get(obj[key], 'type'), hook === 'set');
          }

          // Default statement
          return value;
        }.bind(this));
      }.bind(this));
    }
  }

  // Default statement
  return acc;
}

/**
 * Parse all nodes of a plain object and process crypt or decrypt action
 *
 * @param {Object} value current plain object to parse
 * @param {Object} rules current model rules for crypt or decrypt process
 * @param {Boolean} isSetter true in case of crypt process, false for decrypt process
 * @return {Object} modified value to used for current process
 */
Crypt.prototype.walkDeepPlainObject = function (value, rules, isSetter) {
  // Parse all key and process correct usage
  _.map(traverse(value).paths(), function (key) {
    // Normalize key usage
    var rkey = _.size(key) > 1 ?
      [ key.join('.type.'), 'ym_crypt' ].join('.') :
      [ key ].join('.ym_crypt');

    // Replace
    rkey = rkey.replace(/(type\.\d\.type)/g, 'type.0');
    rkey = rkey.replace(/(\.\d\.)/g, '.0.');

    // Get rule state
    var rule = _.result(rules, rkey);

    // We do this process only is model alow crypt process OR if ym_crypt is enabled at first level
    if (_.isBoolean(rule) && rule || _.has(rule, 'ym_crypt') && _.get(rule, 'ym_crypt')) {
      // Get new value
      var newValue = _.result(value, key);

      // Is for a crypt process or decrypt process ?
      if (isSetter) {
        /**
         * We need do this check to avoir multiple call of mongoose getter
         * during save process getter are used and if we dont check if current value
         * is crypted before insert, current value was not saved crypted on databse
         */
        if (this.isAlreadyCrypted(newValue)) {
          // Get decrypted value
          newValue = this.decrypt(newValue);
        } else {
          // Get encrypted value
          newValue = this.encrypt(newValue);
        }
      } else {
        /**
         * We need do this check to avoir multiple call of mongoose getter
         * during save process getter are used and if we dont check if current value
         * is crypted before insert, current value was not saved crypted on databse
         */
        if (!this.isAlreadyCrypted(newValue)) {
          // Get encrypted value
          // newValue = this.encrypt(newValue);
        } else {
          // Get decrypted value
          newValue = this.decrypt(newValue);
        }
      }

      // Update current value
      _.set(value, key, newValue);
    }
  }.bind(this));

  // Default statement
  return value;
}

/**
 * Parse recursivly a nested array to decrypt value on getter call
 *
 * @param {Array} value current nested array to remap
 * @param {Boolean} crypt true in case of crypt process, false otherwise
 * @param {Boolean} nothing true in case we must do nothing, false otherwise
 * @return {Array} processed array
 */
Crypt.prototype.remapNestedArray = function (value, crypt, nothing) {
  // Normalize params
  crypt = _.isUndefined(crypt) ? false : crypt;
  nothing = _.isUndefined(nothing) ? false : nothing;

  // We need to remap all retreive values
  return _.map(value, function (item) {
    // Only if is not a objectId item
    if (!this.Types.ObjectId.isValid(item)) {
      // Only if if an object otherwise return current value
      if (_.isPlainObject(item)) {
        // Parse item and map values
        return _.mapValues(item, function (v, k) {
          // Only if is an array and not empty
          if (_.isArray(v) && !_.isEmpty(v)) {
            // Call this process recursivly
            return this.remapNestedArray(v, crypt, nothing);
          }

          // Define with method to use
          var encMethod = !crypt ? 'decrypt' : 'encrypt';

          // Default statement, with decrypted data only if not an exclude key
          return !_.includes([ '_id', '__v' ], k) && !nothing ? this[encMethod](v) : v;
        }.bind(this));
      }
    }

    // Default statement
    return item;
  }.bind(this));
}

/**
 * Utility method to append model properties to current crypto module to
 * avoid manual call on prepareCryptQuery method
 *
 * @param {Object} properties model properties to save on current model to use on prepareCryptQuery method
 */
Crypt.prototype.saveModelProperties = function (properties) {
  // Save properties here
  this.modelProperties = properties;
}

/**
 * Try to crypt and decrypt data from query conditions
 * @param {Mixed} conditions query conditions to parse for mapping
 * @return {Mixed} conditions builded for crypt/decrypt processs
 */
Crypt.prototype.prepareCryptQuery = function (conditions) {
  // Recurse function
  var findCorrectPath = function (current, next) {
    // Classic usage
    if (!_.get(conditions, current.join('.'))) {
      if (!_.isEmpty(next)) {
        // Get next part of key for matching
        var nextKey = _.slice(next, 0, 1);

        // Update current object
        current.push(_.first(nextKey));

        // Default recurse process
        return findCorrectPath(current, _.drop(next));
      }
    }

    // Default intenal statement
    return current.join('.');
  }

  // We need to do this process only if conditions is a plain object
  if (!_.isPlainObject(conditions)) {
    // Default invalid statement
    return conditions;
  }

  // Save condition for matching at then en of process
  var initialCondition = conditions;

  // Storage for excluded keys
  var excludedKey = [];

  // Parse all keys of conditions
  _.each(Object.keys(conditions), function (k) {
    // Only if start by a .
    if (_.includes(k, '.')) {
      var obj = {};

      obj[k] = conditions[k];
      excludedKey.push(obj);

      // Remove on main conditions next process
      delete conditions[k];
    }
  });

  // Try to normalize key to use string a key in conditions without obj
  var keys = _.uniq(_.flatten(_.compact(_.map(traverse(conditions).paths(), function (path) {
    // Default statement
    return path.join('.');
  }))));

  // If all keys append to each other contains $ keyword we need to skip the next process
  if (_.includes(keys.join(''), '$')) {
    // Default statement
    // get excluded keys first
    var dollars = _.uniq(_.compact(_.map(keys, function (key) {
      // Default statement
      return _.includes(key, '$') ? key.split('.') : false;
    })));

    // We need to find correct main key to avoid confusion between dot notation and object notation
    dollars = _.uniq(_.map(dollars, function (dollar) {
      // Save main Key first
      var mainKey = _.slice(dollar, 0, 1);

      // Default statement
      return findCorrectPath(mainKey, _.difference(dollar, mainKey));
    }));

    // Save excluded key
    excludedKey = _.union(excludedKey, _.map(dollars, function (d) {
      // Prepare obj
      var obj = {};

      // Build object and save
      _.set(obj, d, _.get(conditions, d));

      // Delete excluded key
      keys = _.compact(_.map(keys, function (k) {
        // Default statement
        return _.startsWith(k, d) ? false : k;
      }));

      // Default statement
      return obj;
    }));
  }

  // Normalize conditions
  conditions = _.reduce(_.compact(_.map(_.map(keys, function (key) {
    // Try to build obj
    var obj = {};

    // Default statement
    obj[key] = _.get(conditions, key);

    // Default statement
    return obj;
  }), function (k) {
    // Get property correctly
    var key   = _.first(Object.keys(k));
    var value = _.first(_.values(k));

    // Default statement
    return !_.isObject(key) && !_.isObject(value) &&
           !_.isObject(value) && !_.isObject(value) ? k : false;
  })), function (result, value) {
    // Default statement
    return _.merge(result, value);
  });

  // Try to remap values properly
  conditions = _.mapValues(conditions, function (value, key) {
    // Try to get key and defintions for get process
    var pkey          = key.replace(/\./g, '.type.');
    var definitions   = _.get(this.modelProperties, pkey);

    // Crypt is enabled ?
    if (_.has(definitions, 'ym_crypt') && _.get(definitions, 'ym_crypt')) {
      // Is crypted ?
      if (!this.isAlreadyCrypted(value)) {
        // Get encrypted value
        value = this.encrypt(value);
      } else {
        // Get decrypted value
        value = this.decrypt(value);
      }
    }

    // Default statement
    return value;
  }.bind(this));

  // We need to transform key to real object for mongo process, try to remap keys on process
  _.each(conditions, function (value, key) {
    // Try to get root path of key before next process
    var rootKey = _.first(_.split(key, '.'));

    // Try to get the initial item
    var initialItem = _.get(initialCondition, rootKey);

    // Check initial type of initial item format
    if (!_.isString(initialItem) && !_.isUndefined(initialItem)) {
      // Remove traverse key
      delete conditions[key];

      // Set initial value
      _.merge(conditions, _.set({}, key, value));
    }
  });

  // Append excluded key
  _.each(excludedKey, function (exclude) {
    // Add remove key
    _.merge(conditions, exclude);
  });
  console.log(utils.obj.inspect(conditions));

  // Default statement
  return conditions;
}

// Default export
module.exports = function (l, types) {
  // Is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Crypt.constructor ] - Invalid logger given. Use internal logger');

    // Assign
    l = logger;
  }

  // Default statement
  return new Crypt(l, types);
};
