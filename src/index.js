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
   * @property logger
   */
  this.logger   = l;

  /**
   * Mongoose instance
   *
   * @property mongoose
   */
  this.mongoose = mongoose;

  /**
   * Model Path definition to use on autoLoading
   *
   * @property path
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
   * @property crud
   * @default false
   */
  this.crud     = false;

  /**
   * Define if models are loaded
   *
   * @property loaded
   * @default false
   */
  this.loaded   = false;

  /**
   * Internal modules
   */
  this.modules = {
    crud          : require('./modules/crud')(l),
    validator     : require('./modules/validator')(l),
    method        : require('./modules/method')(l),
    enums         : require('./modules/enum')(l),
    elastic       : require('./modules/utils/elastic')(l),
    redis         : require('./modules/utils/redis')(l)
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
    this.logger.info([ '[ YMongoose.connect ] - Connection successful on', url ].join(' '));
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
    this.mongoose.connection.on(e, function () {
      // process log
      this.logger.debug([ '[ YMongoose.connect ] - Elasticsearch is :',
        _.capitalize(e) ].join(' '));
    }.bind(this));
  }, this);

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

    // start connection
    this.mongoose.connect(url, options);
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
      // process redis disconnect here
      this.modules.redis.disconnect();
      // has error ?
      if (error) {
        // message
        this.logger.error([ '[ YMongoose.disconnect ] - Disconnect failed.',
                               'Error is :', error.message ].join(' '));
        // reject disconnect failed
        deferred.reject(error);
      } else {
        // successful message
        this.logger.info('[ YMongoose.disconnect ] - Disconnect successful.');
        // success reponse
        deferred.resolve();
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
      host      : joi.string().required().empty().ip({
        version : [ 'ipv4','ipv6' ]
      }).default('127.0.0.1'),
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
 * An utility method to save host config for elastic search instances
 *
 * @deprecated
 * @param {Array} hosts list of hosts to use on elastic configuration
 * @param {Object} options property to set on options
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.elasticHosts = function (hosts, options) {
  // deprecated message
  this.logger.warning([ '[ YMongoose.elasticHosts ] -',
                        ('this method is deprecated.').toUpperCase(),
                        'Use enableElasticsearch instead.',
                        'This method will remove on next major version' ].join(' '));
  // new call
  return this.enableElasticsearch(hosts, options);
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
  return this.setPath(directory);
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
  var type = _.find(types, 'name', stype);

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
      if (hasFile.length === 0) {
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

    // schema value
    var schema = new Schema(value.model.properties);

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

  var context = this; // saving context
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
      this.addModel(task.data).then(function () {
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
    this.logger.debug([ '---------------------------- [',
                          'Process Queue Complete.',
                          '] ----------------------------' ].join(' '));
    // build statistics
    this.logger.debug([ '[ YMongoose.load.queue.drain ] - Statistics -',
                          '[ Added on queue :', nbItems.total,
                          (nbItems.total > 1) ? 'items' : 'item', '] -',
                          '[ Processed :', nbItems.processed,
                          (nbItems.processed > 1) ? 'items' : 'item', '] -',
                          '[ Errors :', errors.length,
                          (errors.length > 1) ? 'items' : 'item',']' ].join(' '));
    // changed loaded status
    this.loaded = (nbItems.processed === nbItems.total);
    // all is processed ?
    if (context.loaded) {
      // success message
      this.logger.info('[ YMongoose.load ] - All Model was processed & loaded.');
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

  // run each model
  _.each(model, function (m) {
    // build file name
    var name = m.replace(path.dirname(m), '');
    // try & catch error
    try {
      // parsed file
      var parsed = JSON.parse(fs.readFileSync(m, 'utf-8'));
      // increment counter
      nbItems.total++;
      // parsed not failed push to queue
      queue.push({ file : name, data : parsed }, function (error) {
        // has error ?
        if (error) {
          // log error message
          context.logger.error([ '[ YMongoose.load ] - Cannot add item to queue for [',
                                    name , ']' ].join(' '));
          // push error on list for drain reject
          errors.push(error);
        }
      });
    } catch (e) {
      // error occured
      this.logger.warning([ '[ YMongoose.load ] - cannot add item to queue.',
                            'Error is : [', e, '] for [', name, ']' ].join(' '));

      // check here if item was pushed on queue
      if (_.last(model) === m && nbItems.total === 0) {
        // build message
        var message = 'All loaded data failed during JSON.parse(). Cannot continue.';
        // log message
        this.logger.error([ '[ YMongoose.load ] -', message ].join(' '));

        // reject
        deferred.reject(message);
        // disconnect
        this.disconnect();
      }
    }
  }, this);

  // return deferred promise
  return deferred.promise;
};

/**
 * Retreive a valid model for usage
 *
 * @param {String} name model name wanted
 * @param {Boolean} instance true is we want an instance false otherwise
 * @return {Boolean|Instance} false if an error occured, a model object if all is ok
 */
YMongoose.prototype.getModel = function (name, instance) {
  // is ready ??
  if (this.isReady(true) && this.isLoaded() &&
      _.isString(name) && !_.isEmpty(name)) {
    // do it in try catch
    try {
      // try to get model
      var Model = this.mongoose.model(name);
      // valid statement
      return (_.isBoolean(instance) && instance) ? new Model() : Model;
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
