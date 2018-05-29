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

// default require for code quality
var modCrud          = require('./modules/crud');
var modValidator     = require('./modules/validator');
var modMethod        = require('./modules/method');
var modEnums         = require('./modules/enum');
var modElastic       = require('./modules/utils/elastic');
var modRedis         = require('./modules/utils/redis');
var modCrypt         = require('./modules/crypto');
var modTypes         = require('./modules/types');

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
  this.logger   = l;

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
  this.paths    = {
    model       : '',
    validator   : '',
    method      : '',
    enums       : ''
  };

  /**
   * Define is we create automatique crud function
   *
   * @private
   * @memberof YMongoose
   * @member {Boolean} crud
   * @default false
   */
  this.crud     = false;

  /**
   * Define if models are loaded
   *
   * @private
   * @memberof YMongoose
   * @member {Boolean} loaded
   * @default false
   */
  this.loaded   = false;

  /**
   * Internal modules
   *
   * @private
   * @memberof YMongoose
   * @member {Boolean} loaded
   */
  this.modules = {
    crud          : modCrud(l),
    validator     : modValidator(l),
    method        : modMethod(l),
    enums         : modEnums(l, mongoose.Types),
    elastic       : modElastic(l),
    redis         : modRedis(l),
    crypt         : modCrypt(l, mongoose.Types),
    modTypes      : modTypes(l, mongoose)
  };
}

/**
 * Check is currenct connection is connected
 *
 * @return {Boolean} true if is connected false otherwise
 */
YMongoose.prototype.isConnected = function () {
  // default statement
  return this.mongoose.connection.readyState === this.mongoose.Connection.STATES.connected;
};

/**
 * Check is current connection is disconnected
 *
 * @return {Boolean} true if is connected false otherwise
 */
YMongoose.prototype.isDisconnected = function () {
  // default statement
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

  // try connect
  this.logger.info([ '[ YMongoose.connect ] -',
                     'Try to connect on [', url, ']' ].join(' '));

  // catch open connection
  this.mongoose.connection.on('open', function () {
    // message
    this.logger.info([ '[ YMongoose.connect ] - Connection succeed on', url ].join(' '));
    // success reponse
    deferred.resolve();
  }.bind(this));

  // listen error event
  this.mongoose.connection.on('error', function (error) {
    // message
    this.logger.error([ '[ YMongoose.connect ] - Connection failed.',
                           'Error is :', error.message ].join(' '));
    // error reponse
    deferred.reject(error);
  }.bind(this));

  // catch defined event for debug
  _.each([ 'connecting', 'connected', 'disconnecting', 'disconnected' ], function (e) {
    // catch each event
    this.mongoose.connection.on(e, function () {
      // process log
      this.logger.debug([ '[ YMongoose.connect ] - Mongoose is :',
        _.capitalize(e) ].join(' '));
    }.bind(this));
  }.bind(this));

  // valid url ?
  if (_.isString(url) && !_.isEmpty(url)) {
    // normalized options
    options = _.isObject(options) && !_.isEmpty(options) ? options : {};

    // check if property sslCA exist
    if (_.has(options, 'server.sslCA') && _.isString(options.server.sslCA)) {
      // create buffer of this file
      options.server.sslCA = [
        fs.readFileSync(path.normalize(process.cwd() + '/' + options.server.sslCA))
      ];
    }

    // check if property sslKey exist
    if (_.has(options, 'server.sslKey') && _.isString(options.server.sslKey)) {
      // create buffer of this file
      options.server.sslKey = [
        fs.readFileSync(path.normalize(process.cwd()  + '/' + options.server.sslKey))
      ];
    }

    // check if property sslCert exist
    if (_.has(options, 'server.sslCert') && _.isString(options.server.sslCert)) {
      // create buffer of this file
      options.server.sslCert = [
        fs.readFileSync(path.normalize(process.cwd()  + '/' + options.server.sslCert))
      ];
    }

    // connect only if mongoosed is not connected
    if (this.isDisconnected()) {
      // start connection
      this.mongoose.connect(url, options);
    }
  } else {
    // invalid url cannot connect
    this.logger.error('[ YMongoose.connect ] - Invalid url, cannot connect.');
    // reject connection failed
    deferred.reject();
  }

  // return deferred promise
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

  // try to disconnect
  this.logger.info('[ YMongoose.disconnect ] - Try to disconnect all connections');

  // is connected ?
  if (this.isConnected()) {
    // disconnect
    this.mongoose.disconnect(function (error) {

      // has any error ?
      if (error) {
        // message
        this.logger.error([ '[ YMongoose.disconnect ] - Disconnect failed.',
                               'Error is :', error.message ].join(' '));
        // reject disconnect failed
        deferred.reject(error);
      } else {
        // process redis disconnect here
        this.modules.redis.disconnect();
        // clean the other thing
        this.mongoose.connection.close(function (cerror) {
          // has error ?
          if (cerror) {
            // message
            this.logger.error([ '[ YMongoose.disconnect ] - Connection close failed.',
                                   'Error is :', cerror.message ].join(' '));
            // reject disconnect failed
            deferred.reject(cerror);
          } else {
            // successful message
            this.logger.info('[ YMongoose.disconnect ] - Closing connection succeed.');
            // success reponse
            deferred.resolve();
          }
        }.bind(this));
      }
    }.bind(this));
  } else {
    // cant disconnect we are not connected
    this.logger.warning('[ YMongoose.disconnect ] - Cannot disconnect orm is not connected.');
    // reject
    deferred.reject();
  }

  // return deferred promise
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
  // normalize hosts
  hosts = _.isArray(hosts) ? hosts : [ hosts || {
    host      : '127.0.0.1',
    port      : 9200,
    protocol  : 'http'
  } ];

  // validation schema
  var schema = joi.array().required().items(
    joi.object().keys({
      host      : joi.string().required().empty().default('127.0.0.1'),
      port      : joi.number().required().default(9200),
      protocol  : joi.string().optional().valid([ 'http', 'https']).default('http'),
      auth      : joi.string().optional().empty()
    }).default({ host : '127.0.0.1', port : 9200, protocol : 'http' })
  ).default([ { host : '127.0.0.1', port : 9200, protocol : 'http' } ]);

  // validate given config
  var validate = joi.validate(hosts, schema);

  // has error ?
  if (validate.error) {
    // log error message
    this.logger.warning([ '[ YMongoose.elasticHosts ] - Invalid host config given :',
                          validate.error ] .join(' '));
    // default invalid statement
    return false;
  }

  // save data
  return this.modules.elastic.enableHosts(validate.value, options);
};

/**
 * enable redis on current module
 *
 * @param {Array} hosts lists of use hosts
 * @param {Object} options options to use on redis instance
 * @param {Boolean} cluster set to true if a cluster connection is needed
 * @param {Number} defaultExpireTime to force the default expire time for all of insertion
 * @return {Object} current redis instance
 */
YMongoose.prototype.enableRedis = function (hosts, options, cluster, defaultExpireTime) {
  // connect redis
  return this.modules.redis.connect(hosts, options, defaultExpireTime, cluster);
};

/**
 * Default accessor to retreive redis instance
 *
 * @return {Object} default redis instance
 */
YMongoose.prototype.getRedis = function () {
  // default statement
  return this.modules.redis;
};

/**
 * Define current models path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false otherwise
 */
YMongoose.prototype.models = function (directory) {
  // message
  this.logger.debug('[ YMongoose.models ] - Try to set model defintion path.');
  // default statement
  return this.setPath(directory, 'model');
};

/**
 * Define current controller path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false otherwise
 */
YMongoose.prototype.validators = function (directory) {
  // message
  this.logger.debug('[ YMongoose.validators ] - Try to set validator defintion path.');
  // default statement
  return this.setPath(directory, 'validator');
};

/**
 * Define current methods path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false otherwise
 */
YMongoose.prototype.methods = function (directory) {
  // message
  this.logger.debug('[ YMongoose.methods ] - Try to set methods defintion path.');
  // default statement
  return this.setPath(directory, 'method');
};

/**
 * Define current enums definition path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false otherwise
 */
YMongoose.prototype.enums = function (directory) {
  // message
  this.logger.debug('[ YMongoose.enums ] - Try to set enums defintion path.');
  // default statement
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
  // default type value
  var types = {
    model       : { ext : 'json', name : 'model' },
    validator   : { ext : 'js', name  : 'validator' },
    method      : { ext : 'js', name  : 'method' },
    enums       : { ext : 'json', name : 'enums' }
  };

  // set default if we need to set controller directory
  var type = _.find(types, [ 'name', stype ]);

  // is valid format ?
  if (!_.isUndefined(type) && _.isObject(type) && _.isString(directory) && !_.isEmpty(directory)) {
    // normalize directory path
    directory = path.isAbsolute(directory) ?
                directory : path.normalize([ process.cwd(), directory ].join('/'));

    // main process
    try {
      // check access sync
      fs.accessSync(directory, fs.R_OK);
      // retreiving stats of directory
      var stats   = fs.statSync(directory);

      // is directory ?
      if (!stats.isDirectory()) {
        // exception
        throw [ directory, 'is not a valid directory.' ].join(' ');
      }

      // check if has data on directory for warning prevent
      var hasFile = glob.sync([ '**/*.', type.ext ].join(''), {
        cwd : directory
      });
      // so isEmpty ?
      if (_.size(hasFile) === 0) {
        this.logger.warning([ '[ YMongoose.setPath ] - Given directory path for',
                              [ type.name, (type.name !== 'enums' ? 's' : '') ].join(''),
                              'seems to be empty.',
                              'Don\'t forget to ad your', type.ext,
                              'file before load call' ].join(' '));
      }

      // set data
      this.paths[type.name] = directory;
      // log message
      this.logger.debug([ '[ YMongoose.setPath ] -',
                          _.capitalize([ type.name, (type.name !== 'enums' ? 's' : '') ].join('')),
                         'path was set to :',
                         this.paths[type.name] ].join(' '));
    } catch (e) {
      // log message
      this.logger.error([ '[ YMongoose.setPath ] - Set path for',
                          [ type.name, (type.name !== 'enums' ? 's' : '') ].join(''),
                          'failed.', e ].join(' '));
      // error on set path disconnect mongoose
      this.disconnect();
      // default statement
      return false;
    }
    // success statement
    return true;
  }

  // error if we exec here
  this.logger.error([ '[ YMongoose.setPath ] - Cannot set directory for [', stype, ']',
                      'Invalid directory given or cannot retreive types rules' ].join(' '));
  // default statement
  return false;
};

/**
 * Get current curred loaded status
 *
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.isLoaded = function () {
  // default statement
  return this.loaded;
};

/**
 * Check is current connector is ready
 *
 * @param {Boolean} showErrors true is we want
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.isReady = function (showErrors) {
  // show errors ?
  if (showErrors) {
    // check connection
    if (!this.isConnected()) {
      this.logger.error('[ YMongoose.isReady ] - Connection is not ready.');
    }
    // model defintion path is properly set ?
    if (_.isEmpty(this.paths.model)) {
      this.logger.error('[ YMongoose.isReady ] - Model definition path is not set.');
    }
    // controller defintion path is properly set ?
    if (_.isEmpty(this.paths.validator)) {
      this.logger.error('[ YMongoose.isReady ] - Validator definition path is not set.');
    }

    // methods defintion path is properly set ?
    if (_.isEmpty(this.paths.method)) {
      this.logger.error('[ YMongoose.isReady ] - Methods definition path is not set.');
    }
    // enums defintion path is properly set ?
    if (_.isEmpty(this.paths.enums)) {
      this.logger.warning('[ YMongoose.isReady ] - Enum definition path is not set.');
    }

  }

  // default statement
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
  // create async
  var deferred = Q.defer();

  // is Ready ??
  if (this.isReady(true)) {
    // has properties property from current model
    if (!_.isObject(value) || _.isEmpty(value) || !_.has(value, 'model') ||
        !_.has(value.model, 'properties') || !_.has(value.model, 'name')) {
      // error message
      this.logger.error('[ YMongoose.addModel ] - Cannot create model. Invalid data given');
      // invalid statement
      deferred.reject();
    }

    // message
    this.logger.debug([ '[ YMongoose.addModel ] - Creating model [',
                        value.model.name, ']' ].join(' '));

    // default statement for next process
    var hasElastic = false;
    // elastic is enabled ?
    if (_.has(value.model, 'elastic') && _.isObject(value.model.elastic)) {
      // is enabled ?
      if (this.modules.elastic.configIsReady() &&
          _.isBoolean(value.model.elastic.enable) && value.model.elastic.enable) {
        // debug message
        this.logger.debug([ '[ YMongoose.addModel ] - Elastic mode is enabled for this model.',
                           'Adding default index on all properties to false' ].join(' '));

        // get defautl indexes
        var indexes = this.modules.elastic.addDefaultIndexes(_.cloneDeep(value.model.properties));

        // merge data to get correct value
        _.merge(indexes, value.model.properties);

        // change elastic status
        hasElastic = true;
      }
    }

    // save and setup the current algorythm and key to use on crypto process
    this.modules.crypt.setAlgorithmAndKey(value.model.crypto);
    // prepare item to crypt process
    var defaultProperties = value.model.properties;
    // prepare properly rules if defined
    var preparedProperties = this.modules.crypt.cryptedRulesIsDefined(value.model.properties) ?
      this.modules.crypt.prepare(value.model.properties) : value.model.properties;
    // schema value
    var schema = new Schema(preparedProperties, { runSettersOnQuery: true });
    // has compound indexes defined ?
    if (_.has(value.model, 'compound') && _.isArray(value.model.compound) &&
      !_.isEmpty(value.model.compound)) {
      // debug message for compound index process
      this.logger.debug('[ YMongoose.addModel ] - Compound is defined try to add indexes');
      // define compound index
      _.each(value.model.compound, function(value) {
        // log debug message
        this.logger.debug([ '[ YMongoose.addModel ] - Try to add compound indexes with :',
          utils.obj.inspect(value) ].join(' '));
        // append index
        schema.index(value);
      }.bind(this));
    }

    // Set toObject method to use getters to force usage of getters
    // This apply all defined getter methods on current schema
    schema.set('toObject', {
      getters   : true,
      virtuals  : true,
      transform : function (doc, ret, options) {
        // remove the _id of every document before returning the result
        if (_.has(ret, 'id')) {
          delete ret.id;
        }

        // return current document
        return ret;
      }
    });

    // append crypto instance to current schema
    schema.static('crypto', function () {
      // append model properties to crypto to avoir manual call of method
      this.modules.crypt.saveModelProperties(defaultProperties);
      // default statement
      return this.modules.crypt;
    }.bind(this));

    // has elastic enable ?
    if (hasElastic) {
      // debug message
      this.logger.debug([ '[ YMongoose.addModel ] - Elastic mode is enabled for this model.',
                         'Adding mongoosastic plugin to current schema' ].join(' '));

      // define here correct client
      // with correct merge values
      var client = new elasticClient.Client(_.merge(_.merge({
        hosts : this.modules.elastic.getHosts()
      }, _.omit(value.model.elastic.options, [ 'hosts', 'host', 'port', 'protocol', 'auth' ])),
        this.modules.elastic.getOptions()));

      // add plugin with client connection
      schema.plugin(elastic, { esClient : client });
    }

    // add flag on schema
    schema.elastic = hasElastic;

    // add crud ?
    if (_.has(value.model, 'crud') && _.has(value.model.crud, 'enable') &&
        _.isObject(value.model.crud) && value.model.crud.enable) {
      // message
      this.logger.debug([ '[ YMongoose.addModel ] - Crud mode is enabled.',
                         'Try to add default methods' ].join(' '));

      // normalize redis include
      var redisIncludes = false;

      // has redis include define ?
      if (value.model.crud.redis && value.model.crud.redis.include) {
        // redis include
        redisIncludes = {
          value   : value.model.crud.redis.include,
          expire  : value.model.crud.redis.expire
        };
      }

      // process
      var cschema = this.createCrud(schema, value.model.crud.exclude, redisIncludes);

      // is valid ?
      if (cschema) {
        // message
        this.logger.debug([ '[ YMongoose.addModel ] - Adding Crud method success' ].join(' '));
        // assign
        schema = cschema;
      }
    }

    // add validator ?
    if (!_.isUndefined(value.model.validator) && !_.isNull(value.model.validator) &&
       _.isString(value.model.validator) && !_.isEmpty(value.model.validator)) {
      // messsage
      this.logger.debug([ '[ YMongoose.addModel ] - A validator is defined.',
                         'Try to add a validate method.' ].join(' '));
      // process
      var vschema = this.createValidator(schema, value.model.validator,
                                         value.model.name.toLowerCase());

      // is valid ?
      if (vschema) {
        // message
        this.logger.debug([ '[ YMongoose.addModel ] - Adding validate method success' ].join(' '));
        // assign
        schema = vschema;
      }
    }

    // add methods ??
    if (!_.isUndefined(value.model.fn) && !_.isNull(value.model.fn) &&
       _.isArray(value.model.fn) && !_.isEmpty(value.model.fn)) {
      // messsage
      this.logger.debug([ '[ YMongoose.addModel ] - External methods are defined.',
                         'Try to add them.' ].join(' '));

      // process
      var mschema = this.createMethod(schema, value.model.fn, value.model.name.toLowerCase());

      // is valid ?
      if (mschema) {
        // message
        this.logger.debug([ '[ YMongoose.addModel ] - Adding external methods success' ].join(' '));
        // assign
        schema = mschema;
      }
    }

    // path is not empty so load
    if (!_.isEmpty(this.paths.enums)) {
      // load enums works ?
      if (this.modules.enums.load(this.paths.enums)) {
        // load ok
        this.logger.debug('[ YMongoose.addModel ] - loading enums value success');
      } else {
        // load nok
        this.logger.warning('[ YMongoose.addModel ] - loading enums value failed');
      }
    }

    // add default enums instance value
    schema.static('enums', function () {
      // return enums instance
      return this.modules.enums;
    }.bind(this));

    // valid statement & set value to default schema
    var model = this.mongoose.model(value.model.name, schema);

    // has elatic ?
    if (hasElastic) {
      // debug message
      this.logger.debug([ '[ YMongoose.addModel ] - Elastic mode is enabled for this model.',
                         'Create mapping to current model' ].join(' '));

      // create for given model mapping
      model.createMapping(function (err, mapping) {
        // so have error
        if (err) {
          // log error message
          this.logger.error([ '[ YMongoose.addModel ] - Elastic create mapping error :',
                              err ].join(' '));
        } else {
          // log success message
          this.logger.debug([ '[ YMongoose.addModel ] - Elastic create mapping success :',
                              utils.obj.inspect(mapping) ].join(' '));
        }
        // reject or resolve
        if (!err) {
          // resolve if all is ok
          deferred.resolve();
        } else {
          // reject result if mapping failed
          deferred.reject();
        }
      }.bind(this));
    } else {
      // resolve
      deferred.resolve();
    }
  } else {
    // reject
    deferred.reject();
  }

  // default statement
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
  // is Ready ??
  if (this.isReady(true)) {
    if (!(value instanceof Schema)) {
      // invalid instance
      this.logger.warning([ ' [ YMongoose.createCrud ] - Cannot process.',
                            ' given schema is not an instanceof Schema' ].join(' '));
      // invalid statement
      return false;
    }

    // valid statement
    return this.modules.crud.add(value, exclude, redisIncludes, this.modules.redis);
  }
  // default statement
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
  // is Ready ??
  if (this.isReady(true)) {
    if (!(value instanceof Schema)) {
      // invalid instance
      this.logger.warning([ ' [ YMongoose.createValidator ] - Cannot process.',
                            ' given schema is not an instanceof Schema' ].join(' '));
      // invalid statement
      return false;
    }

    // valid statement
    return this.modules.validator.add(value, this.paths.validator, validatorName, modelName);
  }
  // default statement
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
  // is Ready ??
  if (this.isReady(true)) {
    if (!(value instanceof Schema)) {
      // invalid instance
      this.logger.warning([ ' [ YMongoose.createMethod ] - Cannot process.',
                            ' given schema is not an instanceof Schema' ].join(' '));
      // invalid statement
      return false;
    }

    // valid statement
    return this.modules.method.add(value, this.paths.method, items, modelName, this.modules.redis);
  }
  // default statement
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

  var errors  = [];   // list of errors

  // nbItem error on load
  var nbItems = {
    total     : 0,
    processed : 0
  };

  // check model definition & controller first
  var model = glob.sync('**/*.json', {
    cwd       : this.paths.model,
    realpath  : true
  });

  // define validator Schema
  var vschema = joi.object().keys({
    model : joi.object().keys({
      name        : joi.string().required(),
      properties  : joi.object().required(),
      crud        : joi.object().required().keys({
        enable  : joi.boolean().required(),
        exclude : joi.array().required().empty(),
        redis   : joi.object().optional().keys({
          enable  : joi.boolean().required().default(false),
          expire  : joi.number().optional().min(0).default(0),
          include : joi.array().items(joi.string().empty().valid([ 'get', 'getOne' ]))
        })
      }).allow('enable', 'exclude'),
      validator   : joi.string().optional(),
      crypto      : joi.object().optional().keys({
        hashType  : joi.string().required().empty().valid('aes256'),
        hashKey   : joi.string().required().empty().min(32)
      }).default({
        hashType  : 'aes256',
        hashKey   : ''
      }),
      compound : joi.array().optional().items(joi.object().required().unknown().empty({}))
    }).unknown()
  }).unknown();

  // create execution queue with 100 concurrency
  var queue = async.queue(function (task, callback) {
    // validate
    var status = joi.validate(task.data, vschema);

    // display big message for more readable log
    this.logger.debug([ '----------------------------',
                          'Processing : [', task.file, ']',
                          '----------------------------' ].join(' '));
    // has error ?
    if (!_.isNull(status.error)) {
      // default error message
      var message = [ 'Invalid schema for [', task.file, '] Error is :',
                      status.error ].join(' ');
      // warning message
      this.logger.error([ '[ YMongoose.load.queue ] -', message ].join(' '));
      // callback with error
      return callback(message);
    } else {
      // add new model
      this.addModel(status.value).then(function () {
        // change nb added items value
        nbItems.processed++;
        // normal process all is ok
        callback();
      }).catch(function () {
        // callback with error
        callback([ 'Cannot create model for  [', task.file, ']' ].join(' '));
      });
    }
  }.bind(this), 100);

  // Callback at the end of queue processing
  queue.drain = function () {
    // message drain ending
    this.logger.debug([ _.repeat('-', 28),
      '[ Process Queue Complete ]', _.repeat('-', 28) ].join(' '));
    this.logger.info('[ YMongoose.load ] - All Model was processed & loaded.');

    // changed loaded status
    this.loaded = (nbItems.processed === nbItems.total);
    // all is processed ?
    if (this.loaded) {
      // success message
      // all is ok so resolve
      deferred.resolve();
    } else {
      // all was not processed
      this.logger.error([ '[ YMongoose.load ] -',
                             'All item was NOT correctly processed.',
                             'Check your logs.' ].join(' ')
                          );
      // reject
      deferred.reject();
      // disconnect error occured
      this.disconnect();
    }
  }.bind(this);

  // all tasks storage
  var tasks = [];

  // Load all custom Types before loading model
  this.modules.modTypes.load(this.modules).then(function () {
    // run each model
    async.each(model, function (m, next) {
      // build file name
      var name = m.replace(path.dirname(m), '');
      // try & catch error
      try {
        // parsed file
        var parsed = JSON.parse(fs.readFileSync(m, 'utf-8'));
        // parsed not failed push to queue
        tasks.push({ file : name, data : parsed });
        // increment counter
        nbItems.total++;
        // got to next item
        next();
      } catch (e) {
        // set correct message
        var message = [ 'Cannot add item to queue. Error is : [', e, '] for [', name, ']' ].join(' ');
        // error occured
        this.logger.error([ '[ YMongoose.load ] -', message ].join(' '));

        // reject with correct message
        deferred.reject(message);
        // disconnect
        this.disconnect();
      }
    }.bind(this), function () {
      // push in queue
      queue.push(tasks, function (error) {
        // has error ?
        if (error) {
          // log error message
          this.logger.error([ '[ YMongoose.load ] - Cannot add an item to queue [',
                                    error , ']' ].join(' '));
          // push error on list for drain reject
          errors.push(error);
        }
      }.bind(this));
    }.bind(this));
  }.bind(this)).catch(function (error) {
    // Error loading type
    this.logger.error([ '[ YMongoose.load.Types ] - Error when loading custom Types [',
    error , ']' ].join(' '));

    // Reject error
    deferred.reject(error);
  }.bind(this));

  // return deferred promise
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
  // is ready ??
  if (this.isReady(true) && this.isLoaded() &&
      _.isString(name) && !_.isEmpty(name)) {
    // do it in try catch
    try {
      // try to get model
      var Model = this.mongoose.model(name);
      // add mongoose Types on model
      Model.Types = mongoose.Types;
      // valid statement
      return (_.isBoolean(isInstance) && isInstance) ? new Model() : Model;
    } catch (e) {
      // show error
      this.logger.error('[ YMongoose.getModel ] - Model not found. Invalid schema name given.');
      // debug message
      this.logger.debug([ '[ YMongoose.getModel ] -', e ].join(' '));
      // invalid statement
      return false;
    }
  }

  // error here
  this.logger.error('[ YMongoose.getModel ] - Cannot get model. Invalid schema name given.');
  // invalid statement
  return false;
};

// Default export
module.exports = function (l) {
  // is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ YMongoose.constructor ] - Invalid logger given. Use internal logger');
    // assign
    l = logger;
  }
  // default statement
  return new (YMongoose)(l);
};
