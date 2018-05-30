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

      /*
      // On array case we need a specific process
      if (_.isArray(data)) {
        // Try to remap data
        crypted = _.compact(_.map(data, function (d) {
          // Default statement
          return utils.crypto.encrypt(this.hashKey, d, this.algorithm);
        }.bind(this)));
      } else {
        // Try to crypt value
        crypted = utils.crypto.encrypt(this.hashKey, data, this.algorithm);
      }
      */

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
    var decrypted = this.encryptDecrypt(data, false, false);;

    /*
    // On array case we need a specific process
    if (_.isArray(data)) {
      // Try to remap data
      decrypted = _.compact(_.map(data, function (d) {
        // Default statement
        return utils.crypto.decrypt(this.hashKey, d, this.algorithm);
      }.bind(this)));
    } else {
      // Try to decrypt value
      decrypted = utils.crypto.decrypt(this.hashKey, data, this.algorithm);
    }
    */

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

    // Default state
    var decrypted = this.encryptDecrypt(data, true, false);;

    /*
    // On array case we need a specific process
    if (_.isArray(data)) {
      // Try to remap data
      decrypted = _.compact(_.map(data, function (d) {
        // Default statement
        return utils.crypto.decrypt(this.hashKey, d, this.algorithm);
      }.bind(this)));

      decrypted = !_.isEmpty(decrypted);
    } else {
      // Try to decrypt value
      decrypted = utils.crypto.decrypt(this.hashKey, data, this.algorithm);
    }
*/
    // Only if crypted is value
    if (decrypted) {
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

//============= NEW PART

Crypt.prototype.encryptDecrypt = function (data, isCheck, isCrypt) {
  // Default state
  var state = false;
  var method = isCrypt ? 'encrypt' : 'decrypt';

  // On array case we need a specific process
  if (_.isArray(data)) {
    // Try to remap data is is an array
    state = _.compact(_.map(data, function (d) {
      console.log(method, d)
      // Default statement
      return utils.crypto[method](this.hashKey, d, this.algorithm);
    }.bind(this)));

    // is to check if data is already encrypt ?
    if (isCheck) {
      console.log('state', state, data);
      state = !_.isEmpty(state);
    }
  } else {
    // Try to decrypt/encrypt value
    state = utils.crypto[method](this.hashKey, data, this.algorithm);
  }

  // default statement
  return state;
}

/**
 * Crypt or decrypt givent value by defined rules
 * @param {Object} obj default object to crypt or decrypt 
 * @param {Boolean} crypt true in case of crypt false otherwise
 */
Crypt.prototype.process = function (obj, crypt) {
  // get properties first
  var cryptProperties = this.getProperties();

  // save context
  var context = this;

  // default statement
  return traverse(obj).map(function (x) {
    // normalize path to process
    var pathToProcess = context.normalizePath(this.path, true);

    console.log('defined properties =>', cryptProperties);
    console.log('path =>', this.path);
    console.log(x);
    console.log('path to process', pathToProcess, _.includes(cryptProperties, pathToProcess));
    // crypt or decrypt is needed ?
    if (_.includes(cryptProperties, pathToProcess)) {
      // try to update current value
      this.update(crypt ? context.encrypt(x) : context.decrypt(x));
    }
   });
};

Crypt.prototype.normalizePath = function (path, includeMongoOperator) {
  // common process
  path = path.join('.').replace(/\d/g, 'digit');
  // extra process
  if (includeMongoOperator) {
    path = path.replace(/(\.\$\w+\.)/g, '.');
    // for $or process
    path = path.replace(/(\$\w+\.digit\.)/, '');
  }

  // default statement
  return path;
}

/**
 * Get save properties for crypt process
 *
 * @param {Object} properties in case we need to override save properties by temp value
 * @return {Array} list of properties to use
 */
Crypt.prototype.getProperties = function (properties) {
  // normalise properties
  properties = properties || this.modelProperties;

  // first get crypt property
  var initial = _.uniq(_.map(_.compact(_.map(traverse(properties).paths(), function (paths) {
    // default statement
    return _.includes(paths, 'ym_crypt') ? _.pullAll(paths, [ 'ym_crypt', 'type' ]) : false;
  })), function (paths) {
    // default statement
    return paths.join('.').replace(/\d/g, 'digit');
  }));
  // Do this for $ mongo operator
  var extra = _.map(initial, function(path) {
    // default statement
    return path.replace(/\.digit\./g, '.');
  });

  // default statement
  return _.uniq(_.union(initial, extra));
}

/**
 * Check if we need to enable crypt hook from givent properties
 * @param {Object} properties defined properties to use for check
 * @return {Boolean} true in case of success
 */
Crypt.prototype.isEnabled = function (properties) {
  // default statement
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
  // only crypt / decrypt properties is defined ?
  if (this.isEnabled(properties)) {
    this.logger.verbose([ '[ YMongoose.cryto.setupHook ] - Setting up hook for model [',
      modelName, ']' ].join(' '));
    // list of predefined hooks
    var hooks = [
      { type : 'pre', method : 'findOneAndUpdate', crypt : true, update : true },
      { type : 'pre', method : 'findByIdAndUpdate', crypt : true, update : true },
      { type : 'pre', method : 'update', crypt : true, update : true },
      { type : 'pre', method : 'save', crypt : true, create : true },
      { type : 'pre', method : 'find', crypt : true, find : true },
      { type : 'pre', method : 'findOne', crypt : true, find : true }
    ];

    // save context for next process
    var context = this;

    // defined all predefine hook for crypt process
    _.each(hooks, function (hook) {
      // Override toObject to transform Object in all case
      schema.set('toObject', {
        transform : function (doc, ret, options) {
          // default statement
          return context.process(JSON.parse(JSON.stringify(ret), false));
        }
      });

      // pre build hook
      schema[hook.type](hook.method, function (next) {  
        // is and update hook ?
        if (hook.update) {
          var query   = context.process(this.getQuery(), hook.crypt);
          var update  = context.process(this.getUpdate(), hook.crypt);
          console.log('Query', query);
          console.log('Update', update);
          // do normal update process
          this.update(query, update);
        }
        // is a create hook
        if (hook.create) {
          // extend current object with correct value
          _.extend(this, context.process(JSON.parse(JSON.stringify(this.toJSON())), hook.crypt));
        }

        // is a find hook ?
        if (hook.find) {
          // only on pre case
          if (hook.type === "pre") {
            // go normal where find process
            this.where(context.process(this.getQuery(), hook.crypt));
          }
        }

        // has a next function defined ?
        if (_.isFunction(next)) {
          // do next process
          next();
        }
      });
    });
  }

  // default statement
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
