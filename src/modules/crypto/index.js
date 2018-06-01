'use strict'

var _         = require('lodash');
var logger    = require('yocto-logger');
var utils     = require('yocto-utils');
var traverse  = require('traverse');
var moment    = require('moment');

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
 * Utility method to append model properties to current crypto module
 *
 * @param {Object} properties model properties to save on current model to use on prepareCryptQuery method
 * @return {Object} current instance
 */
Crypt.prototype.saveModelProperties = function (properties) {
  // Save properties here
  this.modelProperties = properties;

  // Default statement
  return this;
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

      // Default state of crypt method
      var crypted = this.encryptDecrypt(data, false, true);

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

    // Default state
    var decrypted = this.encryptDecrypt(data, false, false);

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
 * Check if given value is already crypt or not
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

    // Check if is crypted ?
    if (this.encryptDecrypt(data, true, false)) {
      // Debug message
      this.logger.verbose([ '[ YMongoose.cryto.isAlreadyCrypted ] - Given data',
        utils.obj.inspect(data), 'is already crypted. Skipping this process !' ].join(' '));

      // Default statement in this case
      return true;
    }

    // Debug message
    this.logger.verbose([ '[ YMongoose.cryto.isAlreadyCrypted ] - Given data',
      utils.obj.inspect(data), 'is not crypted. Do crypt process !' ].join(' '));
  }

  // Default statement
  return false;
};

/**
 * Default method to do encrypt and decrypt action
 *
 * @param {Mixed} data content to encrypt
 * @param {Boolean} isCheck true is cace of encryption verification
 * @param {Boolean} isCrypt true is case of crypt process false otherwise
 * @return {Mixed} data processed
 */
Crypt.prototype.encryptDecrypt = function (data, isCheck, isCrypt) {
  // Default state
  var state = false;
  var method = isCrypt ? 'encrypt' : 'decrypt';

  // On array case we need a specific process
  if (_.isArray(data)) {
    // Try to remap data is is an array
    state = _.compact(_.map(data, function (d) {
      // Default statement
      return utils.crypto[method](this.hashKey, d, this.algorithm);
    }.bind(this)));

    // Is to check if data is already encrypt ?
    if (isCheck) {
      state = !_.isEmpty(state);
    }
  } else {
    // Try to decrypt/encrypt value
    state = utils.crypto[method](this.hashKey, data, this.algorithm);
  }

  // Default statement
  return state;
}

/**
 * Default method to encrypt / decrypt value for redis action
 *
 * @param {Mixed} data content to encrypt
 * @param {Boolean} isCrypt true is case of crypt process false otherwise
 * @return {Mixed} data processed
 */
Crypt.prototype.redisPlainEncryptDecrypt = function (data, isCrypt) {
  // Build needed method
  var method = isCrypt ? 'encrypt' : 'decrypt';

  // Try to decrypt/encrypt value

  return utils.crypto[method](this.hashKey, data, this.algorithm);
}

/**
 * Crypt or decrypt givent value by defined rules
 *
 * @param {Object} obj default object to crypt or decrypt
 * @param {Boolean} crypt true in case of crypt false otherwise
 * @return {Mixed} obj processed
 */
Crypt.prototype.process = function (obj, crypt) {
  // Get properties first
  var cryptProperties = this.getProperties();

  // Save context
  var context = this;

  // Default statement
  return traverse(obj).map(function (x) {
    // Normalize path to process
    var pathToProcess = context.normalizePath(this.path, true);

    // Crypt or decrypt is needed ?
    if (_.includes(cryptProperties, pathToProcess)) {
      // Debug log
      context.logger.verbose([
        '[ Crypt.process ] - Try to', crypt ? 'encrypt' : 'decrypt', pathToProcess
      ].join(' '));

      // Try to update current value
      return this.update(crypt ? context.encrypt(x) : context.formatToDate(context.decrypt(x)));
    }

    // Default statement if current value is not to crypt to get correct date format if is a date
    return this.update(context.formatToDate(x));
  });
};

/**
 * Check if current data is a date representation of date value
 *
 * @param {Mixed} data data to check
 * @return {Mixed} data on original format if is not a date or an Date object
 */
Crypt.prototype.formatToDate = function (data) {
  // Check first is a valid date format
  if (_.isString(data) && moment(data, moment.ISO_8601, true).isValid()) {
    // Default statement
    return new Date(data);
  }

  // Default statement
  return data;
}

Crypt.prototype.normalizePath = function (path, includeMongoOperator) {
  // Common process
  path = path.join('.').replace(/(\d{1,})/g, 'digit');

  // Extra process
  if (includeMongoOperator) {
    path = path.replace(/(\.\$\w+\.)/g, '.');

    // For $KEYWORD.digit process
    path = path.replace(/(\$\w+\.digit\.)/, '');

    // For $KEYWORD.obj
    path = path.replace(/(\$\w+\.)/, '');
  }

  // Default statement
  return path;
}

/**
 * Get save properties for crypt process
 *
 * @param {Object} properties in case we need to override save properties by temp value
 * @return {Array} list of properties to use
 */
Crypt.prototype.getProperties = function (properties) {
  // Normalise properties
  properties = properties || this.modelProperties;

  // First get crypt property
  var initial = _.uniq(_.map(_.compact(_.map(traverse(properties).paths(), function (paths) {
    // Default statement
    return _.includes(paths, 'ym_crypt') ? _.pullAll(paths, [ 'ym_crypt', 'type' ]) : false;
  })), function (paths) {
    // Default statement
    return paths.join('.').replace(/\d/g, 'digit');
  }));

  // Do this for $ mongo operator
  var extra = _.map(initial, function (path) {
    // Default statement
    return path.replace(/\.digit\./g, '.');
  });

  // Default statement
  return _.uniq(_.union(initial, extra));
}

/**
 * Check if we need to enable crypt hook from givent properties
 * @param {Object} properties defined properties to use for check
 * @return {Boolean} true in case of success
 */
Crypt.prototype.isEnabled = function (properties) {
  // Default statement
  return !_.isEmpty(this.getProperties(properties));
}

/**
 * Enable Hook for request on crypt/decrypt process
 *
 * @param {Object} schema default schema to return after hook definition
 * @param {Object} properties default properties to use to check if defined hook is required or not
 * @param {String} modelName current model name
 * @return {Object} update schema
 */
Crypt.prototype.setupHook = function (schema, properties, modelName) {
  // Save properties first

  // Only crypt / decrypt properties is defined ?
  if (this.isEnabled(properties)) {
    this.logger.verbose([ '[ YMongoose.cryto.setupHook ] - Setting up hook for model [',
      modelName, ']' ].join(' '));

    // List of predefined hooks
    var hooks = [
      {
        type   : 'pre',
        method : 'findOneAndUpdate',
        crypt  : true,
        update : true
      },
      {
        type   : 'pre',
        method : 'findByIdAndUpdate',
        crypt  : true,
        update : true
      },
      {
        type   : 'pre',
        method : 'update',
        crypt  : true,
        update : true
      },
      {
        type   : 'pre',
        method : 'save',
        crypt  : true,
        create : true
      },
      {
        type   : 'pre',
        method : 'find',
        crypt  : true,
        find   : true
      },
      {
        type   : 'pre',
        method : 'findOne',
        crypt  : true,
        find   : true
      }
    ];

    // Defined all predefine hook for crypt process
    _.map(hooks, function (hook) {
      // Override toObject to transform Object in all case
      schema.set('toObject', {
        transform : function (doc, ret) {
          // Default statement
          return schema.statics.crypto().process(JSON.parse(JSON.stringify(ret), hook.crypt));
        }
      });

      // Pre build hook
      schema[hook.type](hook.method, function (next) {
        // Is and update hook ?
        if (hook.update) {
          var query   = schema.statics.crypto().process(this.getQuery(), hook.crypt);
          var update  = schema.statics.crypto().process(this.getUpdate(), hook.crypt);

          // Do normal update process
          this.update(query, update);
        }

        // Is a create hook
        if (hook.create) {
          // Extend current object with correct value
          _.extend(this,
            schema.statics.crypto().process(JSON.parse(JSON.stringify(this.toJSON())),
              hook.crypt));
        }

        // Is a find hook ?
        if (hook.find) {
          // Go normal where find process
          this.where(schema.statics.crypto().process(this.getQuery(), hook.crypt));
        }

        // Has a next function defined ?
        if (_.isFunction(next)) {
          // Do next process
          return next();
        }
      });
    });
  }

  // Default statement
  return schema;
};

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
