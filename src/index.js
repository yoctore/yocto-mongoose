'use strict';

var logger        = require('yocto-logger');
var mongoose      = require('mongoose');
var _             = require('lodash');
var path          = require('path');
var fs            = require('fs');
var glob          = require('glob');
var joi           = require('joi');
var async         = require('async');
var Schema        = mongoose.Schema;
var Q             = require('q');
var elastic       = require('mongoosastic');
var utils         = require('yocto-utils');
var elasticClient = require('elasticsearch');

// Default require for code quality
var modCrud          = require('./modules/crud');
var modValidator     = require('./modules/validator');
var modMethod        = require('./modules/method');
var modEnums         = require('./modules/enum');
var modElastic       = require('./modules/utils/elastic');
var modRedis         = require('./modules/utils/redis');

// Use q. to handle default promise in mongoose
mongoose.Promise = require('q').Promise;

/**
 *
 * Utility tool to manage mongoose connection and auto loading models.
 *
 * @date : 24/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @class YMongoose
 */
function YMongoose (l) {
  /**
   * Logger instance
   *
   * @private
   * @memberof YMongoose
   * @member {Instance} logger
   */
  this.logger = l;

  /**
   * Mongoose instance
   *
   * @private
   * @memberof YMongoose
   * @member {Instance} mongoose
   */
  this.mongoose = mongoose;

  /**
   * Model Path definition to use on autoLoading
   *
   * @private
   * @memberof YMongoose
   * @member {Object} paths
   */
  this.paths = {
    model     : '',
    validator : '',
    method    : '',
    enums     : ''
  };

  /**
   * Define is we create automatique crud function
   *
   * @private
   * @memberof YMongoose
   * @member {Boolean} crud
   * @default false
   */
  this.crud = false;

  /**
   * Define if models are loaded
   *
   * @private
   * @memberof YMongoose
   * @member {Boolean} loaded
   * @default false
   */
  this.loaded = false;

  /**
   * Internal modules
   *
   * @private
   * @memberof YMongoose
   * @member {Boolean} loaded
   */
  this.modules = {
    crud      : modCrud(l),
    validator : modValidator(l),
    method    : modMethod(l),
    enums     : modEnums(l, mongoose.Types),
    elastic   : modElastic(l),
    redis     : modRedis(l)
  };
}

/**
 * Check is currenct connection is connected
 *
 * @return {Boolean} true if is connected false otherwise
 */
YMongoose.prototype.isConnected = function () {
  // Default statement
  return this.mongoose.connection.readyState === this.mongoose.Connection.STATES.connected;
};

/**
 * Check is current connection is disconnected
 *
 * @return {Boolean} true if is connected false otherwise
 */
YMongoose.prototype.isDisconnected = function () {
  // Default statement
  return this.mongoose.connection.readyState === this.mongoose.Connection.STATES.disconnected;
};

/**
 * Create a connection on mongo server
 *
 * @param {String} url bdd url connection
 * @param {Object} options options for connection
 * @return {Object} promise status to use for connection testing
 */
YMongoose.prototype.connect = function (url, options) {
  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();

  // Try connect
  this.logger.info([ '[ YMongoose.connect ] -',
    'Try to connect on [', url, ']' ].join(' '));

  // Catch open connection
  this.mongoose.connection.on('open', function () {
    // Message
    this.logger.info([ '[ YMongoose.connect ] - Connection succeed on', url ].join(' '));

    // Success reponse
    deferred.resolve();
  }.bind(this));

  // Listen error event
  this.mongoose.connection.on('error', function (error) {
    // Message
    this.logger.error([ '[ YMongoose.connect ] - Connection failed.',
      'Error is :', error.message ].join(' '));

    // Error reponse
    deferred.reject(error);
  }.bind(this));

  // Catch defined event for debug
  _.each([ 'connecting', 'connected', 'disconnecting', 'disconnected' ], function (e) {
    // Catch each event
    this.mongoose.connection.on(e, function () {
      // Process log
      this.logger.debug([ '[ YMongoose.connect ] - Mongoose is :',
        _.capitalize(e) ].join(' '));
    }.bind(this));
  }.bind(this));

  // Valid url ?
  if (_.isString(url) && !_.isEmpty(url)) {
    // Normalized options
    options = _.isObject(options) && !_.isEmpty(options) ? options : {};

    // Check if property sslCA exist
    if (_.has(options, 'server.sslCA') && _.isString(options.server.sslCA)) {
      // Create buffer of this file
      options.server.sslCA = [
        fs.readFileSync(path.normalize(process.cwd() + '/' + options.server.sslCA))
      ];
    }

    // Check if property sslKey exist
    if (_.has(options, 'server.sslKey') && _.isString(options.server.sslKey)) {
      // Create buffer of this file
      options.server.sslKey = [
        fs.readFileSync(path.normalize(process.cwd() + '/' + options.server.sslKey))
      ];
    }

    // Check if property sslCert exist
    if (_.has(options, 'server.sslCert') && _.isString(options.server.sslCert)) {
      // Create buffer of this file
      options.server.sslCert = [
        fs.readFileSync(path.normalize(process.cwd() + '/' + options.server.sslCert))
      ];
    }

    // Check if has new Url Parser (used for MongoDB driver deprecations)
    if (!_.has(options, 'useNewUrlParser')) {
      options.useNewUrlParser = true;
    }

    // Check if use FindAndModify (used for MongoDB driver deprecations)
    if (!_.has(options, 'useFindAndModify')) {
      options.useFindAndModify = false;
    }

    // Check if has use Create Index (used for MongoDB driver deprecations)
    if (!_.has(options, 'useCreateIndex')) {
      options.useCreateIndex = true;
    }

    // Connect only if mongoosed is not connected
    if (this.isDisconnected()) {
      // Start connection
      this.mongoose.connect(url, options);
    }
  } else {
    // Invalid url cannot connect
    this.logger.error('[ YMongoose.connect ] - Invalid url, cannot connect.');

    // Reject connection failed
    deferred.reject();
  }

  // Return deferred promise
  return deferred.promise;
};

/**
 * Disconnection current connection
 *
 * @return {Object} promise status to use for connection testing
 */
YMongoose.prototype.disconnect = function () {
  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();

  // Try to disconnect
  this.logger.info('[ YMongoose.disconnect ] - Try to disconnect all connections');

  // Is connected ?
  if (this.isConnected()) {
    // Disconnect
    this.mongoose.disconnect(function (error) {
      // Has any error ?
      if (error) {
        // Message
        this.logger.error([ '[ YMongoose.disconnect ] - Disconnect failed.',
          'Error is :', error.message ].join(' '));

        // Reject disconnect failed
        deferred.reject(error);
      } else {
        // Process redis disconnect here
        this.modules.redis.disconnect();

        // Clean the other thing
        this.mongoose.connection.close(function (cerror) {
          // Has error ?
          if (cerror) {
            // Message
            this.logger.error([ '[ YMongoose.disconnect ] - Connection close failed.',
              'Error is :', cerror.message ].join(' '));

            // Reject disconnect failed
            deferred.reject(cerror);
          } else {
            // Successful message
            this.logger.info('[ YMongoose.disconnect ] - Closing connection succeed.');

            // Success reponse
            deferred.resolve();
          }
        }.bind(this));
      }
    }.bind(this));
  } else {
    // Cant disconnect we are not connected
    this.logger.warning('[ YMongoose.disconnect ] - Cannot disconnect orm is not connected.');

    // Reject
    deferred.reject();
  }

  // Return deferred promise
  return deferred.promise;
};

/**
 * An utility method to save host config for elastic search instances
 *
 * @param {Array} hosts list of hosts to use on elastic configuration
 * @param {Object} options property to set on options
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.enableElasticsearch = function (hosts, options) {
  // Normalize hosts
  hosts = _.isArray(hosts) ? hosts : [ hosts || {
    host     : '127.0.0.1',
    port     : 9200,
    protocol : 'http'
  } ];

  // Validation schema
  var schema = joi.array().required().items(
    joi.object().keys({
      host     : joi.string().required().empty().default('127.0.0.1'),
      port     : joi.number().required().default(9200),
      protocol : joi.string().optional().valid([ 'http', 'https' ]).default('http'),
      auth     : joi.string().optional().empty()
    }).default({
      host     : '127.0.0.1',
      port     : 9200,
      protocol : 'http'
    })
  ).default([ {
    host     : '127.0.0.1',
    port     : 9200,
    protocol : 'http'
  } ]);

  // Validate given config
  var validate = joi.validate(hosts, schema);

  // Has error ?
  if (validate.error) {
    // Log error message
    this.logger.warning([ '[ YMongoose.elasticHosts ] - Invalid host config given :',
      validate.error ].join(' '));

    // Default invalid statement
    return false;
  }

  // Save data
  return this.modules.elastic.enableHosts(validate.value, options);
};

/**
 * Enable redis on current module
 *
 * @param {Array} hosts lists of use hosts
 * @param {Object} options options to use on redis instance
 * @param {Boolean} cluster set to true if a cluster connection is needed
 * @param {Number} defaultExpireTime to force the default expire time for all of insertion
 * @return {Object} current redis instance
 */
YMongoose.prototype.enableRedis = function (hosts, options, cluster, defaultExpireTime) {
  // Connect redis
  return this.modules.redis.connect(hosts, options, defaultExpireTime, cluster);
};

/**
 * Default accessor to retreive redis instance
 *
 * @return {Object} default redis instance
 */
YMongoose.prototype.getRedis = function () {
  // Default statement
  return this.modules.redis;
};

/**
 * Define current models path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false otherwise
 */
YMongoose.prototype.models = function (directory) {
  // Message
  this.logger.debug('[ YMongoose.models ] - Try to set model defintion path.');

  // Default statement
  return this.setPath(directory, 'model');
};

/**
 * Define current controller path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false otherwise
 */
YMongoose.prototype.validators = function (directory) {
  // Message
  this.logger.debug('[ YMongoose.validators ] - Try to set validator defintion path.');

  // Default statement
  return this.setPath(directory, 'validator');
};

/**
 * Define current methods path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false otherwise
 */
YMongoose.prototype.methods = function (directory) {
  // Message
  this.logger.debug('[ YMongoose.methods ] - Try to set methods defintion path.');

  // Default statement
  return this.setPath(directory, 'method');
};

/**
 * Define current enums definition path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false otherwise
 */
YMongoose.prototype.enums = function (directory) {
  // Message
  this.logger.debug('[ YMongoose.enums ] - Try to set enums defintion path.');

  // Default statement
  return this.setPath(directory, 'enums');
};

/**
 * Set path of model and directory for loading
 *
 * @param {String} directory directory path to set
 * @param {String} stype defined witch element we prepare to defined
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.setPath = function (directory, stype) {
  // Default type value
  var types = {
    model : {
      ext  : 'json',
      name : 'model'
    },
    validator : {
      ext  : 'js',
      name : 'validator'
    },
    method : {
      ext  : 'js',
      name : 'method'
    },
    enums : {
      ext  : 'json',
      name : 'enums'
    }
  };

  // Set default if we need to set controller directory
  var type = _.find(types, [ 'name', stype ]);

  // Is valid format ?
  if (!_.isUndefined(type) && _.isObject(type) && _.isString(directory) && !_.isEmpty(directory)) {
    // Normalize directory path
    directory = path.isAbsolute(directory) ?
      directory : path.normalize([ process.cwd(), directory ].join('/'));

    // Main process
    try {
      // Check access sync
      fs.accessSync(directory, fs.R_OK);

      // Retreiving stats of directory
      var stats   = fs.statSync(directory);

      // Is directory ?
      if (!stats.isDirectory()) {
        // Exception
        throw [ directory, 'is not a valid directory.' ].join(' ');
      }

      // Check if has data on directory for warning prevent
      var hasFile = glob.sync([ '**/*.', type.ext ].join(''), {
        cwd : directory
      });

      // So isEmpty ?

      if (_.size(hasFile) === 0) {
        this.logger.warning([ '[ YMongoose.setPath ] - Given directory path for',
          [ type.name, type.name !== 'enums' ? 's' : '' ].join(''),
          'seems to be empty.',
          'Don\'t forget to ad your', type.ext,
          'file before load call' ].join(' '));
      }

      // Set data
      this.paths[type.name] = directory;

      // Log message
      this.logger.debug([ '[ YMongoose.setPath ] -',
        _.capitalize([ type.name, type.name !== 'enums' ? 's' : '' ].join('')),
        'path was set to :',
        this.paths[type.name] ].join(' '));
    } catch (e) {
      // Log message
      this.logger.error([ '[ YMongoose.setPath ] - Set path for',
        [ type.name, type.name !== 'enums' ? 's' : '' ].join(''),
        'failed.', e ].join(' '));

      // Error on set path disconnect mongoose
      this.disconnect();

      // Default statement
      return false;
    }

    // Success statement
    return true;
  }

  // Error if we exec here
  this.logger.error([ '[ YMongoose.setPath ] - Cannot set directory for [', stype, ']',
    'Invalid directory given or cannot retreive types rules' ].join(' '));

  // Default statement
  return false;
};

/**
 * Get current curred loaded status
 *
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.isLoaded = function () {
  // Default statement
  return this.loaded;
};

/**
 * Check is current connector is ready
 *
 * @param {Boolean} showErrors true is we want
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.isReady = function (showErrors) {
  // Show errors ?
  if (showErrors) {
    // Check connection
    if (!this.isConnected()) {
      this.logger.error('[ YMongoose.isReady ] - Connection is not ready.');
    }

    // Model defintion path is properly set ?
    if (_.isEmpty(this.paths.model)) {
      this.logger.error('[ YMongoose.isReady ] - Model definition path is not set.');
    }

    // Controller defintion path is properly set ?
    if (_.isEmpty(this.paths.validator)) {
      this.logger.error('[ YMongoose.isReady ] - Validator definition path is not set.');
    }

    // Methods defintion path is properly set ?
    if (_.isEmpty(this.paths.method)) {
      this.logger.error('[ YMongoose.isReady ] - Methods definition path is not set.');
    }

    // Enums defintion path is properly set ?
    if (_.isEmpty(this.paths.enums)) {
      this.logger.warning('[ YMongoose.isReady ] - Enum definition path is not set.');
    }
  }

  // Default statement
  return this.isConnected() && !_.isEmpty(this.paths.model) &&
         !_.isEmpty(this.paths.validator) && !_.isEmpty(this.paths.method);
};

/**
 * Create a model from given data
 *
 * @param {Object} value data to used for creation
 * @return {Boolean} created model or false if an error occured
 */
YMongoose.prototype.addModel = function (value) {
  // Create async
  var deferred = Q.defer();

  // Is Ready ??
  if (this.isReady(true)) {
    // Has properties property from current model
    if (!_.isObject(value) || _.isEmpty(value) || !_.has(value, 'model') ||
        !_.has(value.model, 'properties') || !_.has(value.model, 'name')) {
      // Error message
      this.logger.error('[ YMongoose.addModel ] - Cannot create model. Invalid data given');

      // Invalid statement
      deferred.reject();
    }

    // Message
    this.logger.debug([ '[ YMongoose.addModel ] - Creating model [',
      value.model.name, ']' ].join(' '));

    // Default statement for next process
    var hasElastic = false;

    // Elastic is enabled ?

    if (_.has(value.model, 'elastic') && _.isObject(value.model.elastic)) {
      // Is enabled ?
      if (this.modules.elastic.configIsReady() &&
          _.isBoolean(value.model.elastic.enable) && value.model.elastic.enable) {
        // Debug message
        this.logger.debug([ '[ YMongoose.addModel ] - Elastic mode is enabled for this model.',
          'Adding default index on all properties to false' ].join(' '));

        // Get defautl indexes
        var indexes = this.modules.elastic.addDefaultIndexes(_.cloneDeep(value.model.properties));

        // Merge data to get correct value
        _.merge(indexes, value.model.properties);

        // Change elastic status
        hasElastic = true;
      }
    }

    // Schema value
    var schema = new Schema(value.model.properties);

    // Has elastic enable ?
    if (hasElastic) {
      // Debug message
      this.logger.debug([ '[ YMongoose.addModel ] - Elastic mode is enabled for this model.',
        'Adding mongoosastic plugin to current schema' ].join(' '));

      // Define here correct client
      // with correct merge values
      var client = new elasticClient.Client(_.merge(_.merge({
        hosts : this.modules.elastic.getHosts()
      }, _.omit(value.model.elastic.options, [ 'hosts', 'host', 'port', 'protocol', 'auth' ])),
      this.modules.elastic.getOptions()));

      // Add plugin with client connection
      schema.plugin(elastic, {
        esClient : client
      });
    }

    // Add flag on schema
    schema.elastic = hasElastic;

    // Add crud ?
    if (_.has(value.model, 'crud') && _.has(value.model.crud, 'enable') &&
        _.isObject(value.model.crud) && value.model.crud.enable) {
      // Message
      this.logger.debug([ '[ YMongoose.addModel ] - Crud mode is enabled.',
        'Try to add default methods' ].join(' '));

      // Normalize redis include
      var redisIncludes = false;

      // Has redis include define ?
      if (value.model.crud.redis && value.model.crud.redis.include) {
        // Redis include
        redisIncludes = {
          value  : value.model.crud.redis.include,
          expire : value.model.crud.redis.expire
        };
      }

      // Process
      var cschema = this.createCrud(schema, value.model.crud.exclude, redisIncludes);

      // Is valid ?
      if (cschema) {
        // Message
        this.logger.debug([ '[ YMongoose.addModel ] - Adding Crud method success' ].join(' '));

        // Assign
        schema = cschema;
      }
    }

    // Add validator ?
    if (!_.isUndefined(value.model.validator) && !_.isNull(value.model.validator) &&
       _.isString(value.model.validator) && !_.isEmpty(value.model.validator)) {
      // Messsage
      this.logger.debug([ '[ YMongoose.addModel ] - A validator is defined.',
        'Try to add a validate method.' ].join(' '));

      // Process
      var vschema = this.createValidator(schema, value.model.validator,
        value.model.name.toLowerCase());

      // Is valid ?
      if (vschema) {
        // Message
        this.logger.debug([ '[ YMongoose.addModel ] - Adding validate method success' ].join(' '));

        // Assign
        schema = vschema;
      }
    }

    // Add methods ??
    if (!_.isUndefined(value.model.fn) && !_.isNull(value.model.fn) &&
       _.isArray(value.model.fn) && !_.isEmpty(value.model.fn)) {
      // Messsage
      this.logger.debug([ '[ YMongoose.addModel ] - External methods are defined.',
        'Try to add them.' ].join(' '));

      // Process
      var mschema = this.createMethod(schema, value.model.fn, value.model.name.toLowerCase());

      // Is valid ?
      if (mschema) {
        // Message
        this.logger.debug([ '[ YMongoose.addModel ] - Adding external methods success' ].join(' '));

        // Assign
        schema = mschema;
      }
    }

    // Path is not empty so load
    if (!_.isEmpty(this.paths.enums)) {
      // Load enums works ?
      if (this.modules.enums.load(this.paths.enums)) {
        // Load ok
        this.logger.debug('[ YMongoose.addModel ] - loading enums value success');
      } else {
        // Load nok
        this.logger.warning('[ YMongoose.addModel ] - loading enums value failed');
      }
    }

    // Add default enums instance value
    schema.static('enums', function () {
      // Return enums instance
      return this.modules.enums;
    }.bind(this));

    // Valid statement & set value to default schema
    var model = this.mongoose.model(value.model.name, schema);

    // Has elatic ?
    if (hasElastic) {
      // Debug message
      this.logger.debug([ '[ YMongoose.addModel ] - Elastic mode is enabled for this model.',
        'Create mapping to current model' ].join(' '));

      // Create for given model mapping
      model.createMapping(function (err, mapping) {
        // So have error
        if (err) {
          // Log error message
          this.logger.error([ '[ YMongoose.addModel ] - Elastic create mapping error :',
            err ].join(' '));
        } else {
          // Log success message
          this.logger.debug([ '[ YMongoose.addModel ] - Elastic create mapping success :',
            utils.obj.inspect(mapping) ].join(' '));
        }

        // Reject or resolve
        if (!err) {
          // Resolve if all is ok
          deferred.resolve();
        } else {
          // Reject result if mapping failed
          deferred.reject();
        }
      }.bind(this));
    } else {
      // Resolve
      deferred.resolve();
    }
  } else {
    // Reject
    deferred.reject();
  }

  // Default statement
  return deferred.promise;
};

/**
 * Adding crud method to current object
 *
 * @param {Object} value a valid schema instance to use
 * @param {Array} exclude method to exclude on add crud request
 * @param {Object} redisIncludes default redis include config retreive form model definition
 * @return {Object|Boolean} if all is ok return new schema false otherwise
 */
YMongoose.prototype.createCrud = function (value, exclude, redisIncludes) {
  // Is Ready ??
  if (this.isReady(true)) {
    if (!(value instanceof Schema)) {
      // Invalid instance
      this.logger.warning([ ' [ YMongoose.createCrud ] - Cannot process.',
        ' given schema is not an instanceof Schema' ].join(' '));

      // Invalid statement
      return false;
    }

    // Valid statement
    return this.modules.crud.add(value, exclude, redisIncludes, this.modules.redis);
  }

  // Default statement
  return false;
};

/**
 * Create & add a validate function on current schema for create usage
 *
 * @param {Object} value default schema to use
 * @param {String} validatorName validator name to retreive on validators files
 * @param {String} modelName model name to use for validator filter files
 * @return {Object|Boolean} if all is ok return new schema false otherwise
 */
YMongoose.prototype.createValidator = function (value, validatorName, modelName) {
  // Is Ready ??
  if (this.isReady(true)) {
    if (!(value instanceof Schema)) {
      // Invalid instance
      this.logger.warning([ ' [ YMongoose.createValidator ] - Cannot process.',
        ' given schema is not an instanceof Schema' ].join(' '));

      // Invalid statement
      return false;
    }

    // Valid statement
    return this.modules.validator.add(value, this.paths.validator, validatorName, modelName);
  }

  // Default statement
  return false;
};

/**
 * Adding custom method to current object
 *
 * @param {Object} value default schema to use
 * @param {String} items method name to retreive on validators files
 * @param {String} modelName model name to use for validator filter files
 * @return {Object|Boolean} if all is ok return new schema false otherwise
 */
YMongoose.prototype.createMethod = function (value, items, modelName) {
  // Is Ready ??
  if (this.isReady(true)) {
    if (!(value instanceof Schema)) {
      // Invalid instance
      this.logger.warning([ ' [ YMongoose.createMethod ] - Cannot process.',
        ' given schema is not an instanceof Schema' ].join(' '));

      // Invalid statement
      return false;
    }

    // Valid statement
    return this.modules.method.add(value, this.paths.method, items, modelName, this.modules.redis);
  }

  // Default statement
  return false;
};

/**
 * Load models, from given path
 *
 * @return {Object} a valid promise
 */
YMongoose.prototype.load = function () {
  // Create our deferred object, which we will use in our promise chain
  var deferred = Q.defer();

  var errors  = []; // List of errors

  // nbItem error on load
  var nbItems = {
    total     : 0,
    processed : 0
  };

  // Check model definition & controller first
  var model = glob.sync('**/*.json', {
    cwd      : this.paths.model,
    realpath : true
  });

  // Define validator Schema
  var vschema = joi.object().keys({
    model : joi.object().keys({
      name       : joi.string().required(),
      properties : joi.object().required(),
      crud       : joi.object().required().keys({
        enable  : joi.boolean().required(),
        exclude : joi.array().required().empty(),
        redis   : joi.object().optional().keys({
          enable  : joi.boolean().required().default(false),
          expire  : joi.number().optional().min(0).default(0),
          include : joi.array().items(joi.string().empty().valid([ 'get', 'getOne' ]))
        })
      }).allow('enable', 'exclude'),
      validator : joi.string().optional()
    }).unknown()
  }).unknown();

  // Create execution queue with 100 concurrency
  var queue = async.queue(function (task, callback) {
    // Validate
    var status = joi.validate(task.data, vschema);

    // Display big message for more readable log
    this.logger.debug([ '----------------------------',
      'Processing : [', task.file, ']',
      '----------------------------' ].join(' '));

    // Has error ?
    if (!_.isNull(status.error)) {
      // Default error message
      var message = [ 'Invalid schema for [', task.file, '] Error is :',
        status.error ].join(' ');

      // Warning message

      this.logger.error([ '[ YMongoose.load.queue ] -', message ].join(' '));

      // Callback with error
      return callback(message);
    }

    // Add new model
    this.addModel(task.data).then(function () {
      // Change nb added items value
      nbItems.processed++;

      // Normal process all is ok
      callback();
    }).catch(function () {
      // Callback with error
      callback([ 'Cannot create model for  [', task.file, ']' ].join(' '));
    });
  }.bind(this), 100);

  // Callback at the end of queue processing
  queue.drain(function () {
    // Message drain ending
    this.logger.debug([ _.repeat('-', 28),
      '[ Process Queue Complete ]', _.repeat('-', 28) ].join(' '));
    this.logger.info('[ YMongoose.load ] - All Model was processed & loaded.');

    // Changed loaded status
    this.loaded = nbItems.processed === nbItems.total;

    // All is processed ?
    if (this.loaded) {
      // Success message
      // all is ok so resolve
      deferred.resolve();
    } else {
      // All was not processed
      this.logger.error([ '[ YMongoose.load ] -',
        'All item was NOT correctly processed.',
        'Check your logs.' ].join(' ')
      );

      // Reject
      deferred.reject();

      // Disconnect error occured
      this.disconnect();
    }
  }.bind(this));

  // All tasks storage
  var tasks = [];

  // Run each model

  async.each(model, function (m, next) {
    // Build file name
    var name = m.replace(path.dirname(m), '');

    // Try & catch error

    try {
      // Parsed file
      var parsed = JSON.parse(fs.readFileSync(m, 'utf-8'));

      // Parsed not failed push to queue

      tasks.push({
        file : name,
        data : parsed
      });

      // Increment counter
      nbItems.total++;

      // Got to next item
      next();
    } catch (e) {
      // Set correct message
      var message = [ 'Cannot add item to queue. Error is : [', e, '] for [', name, ']' ].join(' ');

      // Error occured

      this.logger.error([ '[ YMongoose.load ] -', message ].join(' '));

      // Reject with correct message
      deferred.reject(message);

      // Disconnect
      this.disconnect();
    }
  }.bind(this), function () {
    // Push in queue
    queue.push(tasks, function (error) {
      // Has error ?
      if (error) {
        // Log error message
        this.logger.error([ '[ YMongoose.load ] - Cannot add an item to queue [',
          error , ']' ].join(' '));

        // Push error on list for drain reject
        errors.push(error);
      }
    }.bind(this));
  }.bind(this));

  // Return deferred promise
  return deferred.promise;
};

/**
 * Retreive a valid model for usage
 *
 * @param {String} name model name wanted
 * @param {Boolean} isInstance true is we want an instance false otherwise
 * @return {Boolean|Instance} false if an error occured, a model object if all is ok
 */
YMongoose.prototype.getModel = function (name, isInstance) {
  // Is ready ??
  if (this.isReady(true) && this.isLoaded() &&
      _.isString(name) && !_.isEmpty(name)) {
    // Do it in try catch
    try {
      // Try to get model
      var Model = this.mongoose.model(name);

      // Add mongoose Types on model

      Model.Types = mongoose.Schema.Types;

      // Valid statement
      return _.isBoolean(isInstance) && isInstance ? new Model() : Model;
    } catch (e) {
      // Show error
      this.logger.error('[ YMongoose.getModel ] - Model not found. Invalid schema name given.');

      // Debug message
      this.logger.debug([ '[ YMongoose.getModel ] -', e ].join(' '));

      // Invalid statement
      return false;
    }
  }

  // Error here
  this.logger.error('[ YMongoose.getModel ] - Cannot get model. Invalid schema name given.');

  // Invalid statement
  return false;
};

// Default export
module.exports = function (l) {
  // Is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ YMongoose.constructor ] - Invalid logger given. Use internal logger');

    // Assign
    l = logger;
  }

  // Default statement
  return new YMongoose(l);
};
