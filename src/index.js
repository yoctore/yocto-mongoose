var logger    = require('yocto-logger');
var crud      = require('./modules/crud')(logger);
var validator = require('./modules/validator')(logger);
var mongoose  = require('mongoose');
var _         = require('lodash');
var Promise   = require('promise');
var path      = require('path');
var fs        = require('fs');
var glob      = require('glob');
var joi       = require('joi');
var async     = require('async');
var Schema    = mongoose.Schema;

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
function YMongoose (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger   = logger;

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
    validator   : ''
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
  // save current context
  var context =  this;

  // try connect
  this.logger.info('[ YMongoose.connect ] - Try to create a connection.');
  // default statement
  return new Promise(function (fulfill, reject) {
    // listen open event
    context.mongoose.connection.on('open', function () {
      // message
      context.logger.info('[ YMongoose.connect ] - Connection successful.');
      // success reponse
      fulfill();
    });

    // listen error event
    context.mongoose.connection.on('error', function (error) {
      // message
      context.logger.error([ '[ YMongoose.connect ] - Connection failed.',
                             'Error is :', error.message ].join(' '));
      // success reponse
      reject(error);
    });

    // valid url ?
    if (_.isString(url) && !_.isEmpty(url)) {
      // normalized options
      options = _.isObject(options) && !_.isEmpty(options) ? options : {};
      // start connection
      context.mongoose.connect(url, options);
    } else {
      // invalid url cannot connect
      context.logger.error('[ YMongoose.connect ] - Invalid url, cannot connect.');
      // reject connection failed
      reject();
    }
  });
};

/**
 * Disconnection current connection
 *
 * @return {Object} promise status to use for connection testing
 */
YMongoose.prototype.disconnect = function () {
  // save current context
  var context = this;

  // try to disconnect
  this.logger.info('[ YMongoose.disconnect ] - Try to disconnect all connections.');
  // default statement
  return new Promise(function (fulfill, reject) {
    // is connected ?
    if (context.isConnected()) {
      // disconnect
      context.mongoose.disconnect(function (error) {
        if (error) {
          // message
          context.logger.error([ '[ YMongoose.disconnect ] - Disconnect failed.',
                                 'Error is :', error.message ].join(' '));
          // reject disconnect failed
          reject(error);
        } else {
          // successful message
          context.logger.info('[ YMongoose.disconnect ] - Disconnect successful.');
          // success reponse
          fulfill();
        }
      });
    } else {
      // cant disconnect we are not connected
      context.logger.warning('[ YMongoose.disconnect ] - Cannot disconnect orm is not connected.');
      // reject
      reject();
    }
  });
};

/**
 * Set path of model and directory for loading
 *
 * @param {String} directory directory path to set
 * @param {Boolean} validator true if we want set controller path
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.setPath = function (directory, validator) {
  // set default if we need to set controller directory
  validator = _.isBoolean(validator) && validator ? validator : false;

  // is valid format ?
  if (_.isString(directory) && !_.isEmpty(directory)) {
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
      var hasFile = glob.sync([ '*.', (validator ? 'js' : 'json') ].join(' '), {
        cwd : directory
      });
      // so isEmpty ?
      if (hasFile.length === 0) {
        this.logger.warning([ '[ YMongoose.setPath ] - Given directory path for',
                              (validator ? 'Validators' : 'Models'),
                              'seems to be empty.',
                              'Don\'t forget to ad your', (validator ? 'js' : 'json'),
                              'file before load call' ].join(' '));
      }

      // set data
      this.paths[ (validator ? 'validator' : 'model') ] = directory;
      // log message
      this.logger.info([ '[ YMongoose.setPath ] -', (validator ? 'Validators' : 'Models'),
                         'path was set to :',
                         this.paths[ (validator ? 'validator' : 'model') ] ].join(' '));
    } catch (e) {
      // log message
      this.logger.error([ '[ YMongoose.setPath ] - Set path for',
                          (validator ? 'Validators' : 'Models'),
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
  this.logger.error('[ YMongoose.setPath ] - Cannot set model directory. Invalid directory given.');
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
  }

  // default statement
  return this.isConnected() && !_.isEmpty(this.paths.model) && !_.isEmpty(this.paths.validator);
};

/**
 * Define current models path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false othewise
 */
YMongoose.prototype.models = function (directory) {
  // message
  this.logger.info('[ YMongoose.models ] - Try to set model defintion path.');
  // default statement
  return this.setPath(directory);
};

/**
 * Define current controller path to use for mapping
 *
 * @param {String} directory directory path to use
 * @return {Boolean} true if add was ok false othewise
 */
YMongoose.prototype.validators = function (directory) {
  // message
  this.logger.info('[ YMongoose.validators ] - Try to set validator defintion path.');
  // default statement
  return this.setPath(directory, true);
};

/**
 * Create a model from given data
 *
 * @param {Object} value data to used for creation
 * @return {Boolean|Object} created model or false if an error occured
 */
YMongoose.prototype.addModel = function (value) {
  // is Ready ??
  if (this.isReady(true)) {
    // has properties property from current model
    if (!_.isObject(value) || _.isEmpty(value) || !_.has(value, 'model') ||
        !_.has(value.model, 'properties') || !_.has(value.model, 'name')) {
      // error message
      this.logger.error('[ YMongoose.addModel ] - Cannot create model. Invalid data given');
      // invalid statement
      return false;
    }

    // message
    this.logger.info([ '[ YMongoose.addModel ] - Creating model :', value.model.name ].join(' '));

    // schema value
    var schema = new Schema(value.model.properties);

    // add crud ?
    if (value.model.crud.enable) {
      // message
      this.logger.info('[ YMongoose.addModel ] - Crud mode is enabled. try to ass defined method');
      // process
      var cschema = this.createCrud(schema, value.model.crud.exclude);

      // is valid ?
      if (cschema) {
        // message
        this.logger.info('[ YMongoose.addModel ] - Add new schema with generated crud method');
        // assign
        schema = cschema;
      }
    }

    // add validator ?
    if (!_.isUndefined(value.model.validator) && !_.isNull(value.model.validator) &&
       _.isString(value.model.validator) && !_.isEmpty(value.model.validator)) {
      // messsage
      this.logger.info([ '[ YMongoose.addModel ] - A validator is defined try',
                         'to add validate method' ].join(' '));
      // process
      var vschema = this.createValidator(schema, value.model.validator);

      // is valid ?
      if (vschema) {
        // message
        this.logger.info('[ YMongoose.addModel ] - Add new schema with given validtor method');
        // assign
        schema = vschema;
      }
    }
    // valid statement
    return this.mongoose.model(value.model.name, schema);
  }

  // default statement
  return false;
};

/**
 * Adding crud method to current object
 *
 * @param {Object} value a valid schema instance to use
 * @param {Array} exclude method to exclude on add crud request
 * @return {Object|Boolean} if all is ok return new schema false otherwise
 */
YMongoose.prototype.createCrud = function (value, exclude) {
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
    return crud.add(value, exclude);
  }
  // default statement
  return false;
};

/**
 * Create & add a validate function on current schema for create usage
 *
 * @param {Object} value default schema to use
 * @param {String} name validator name to retreive on validators files
 * @return {Object|Boolean} if all is ok return new schema false otherwise
 */
YMongoose.prototype.createValidator = function (value, name) {
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
    return validator.add(value, this.paths.validator, name);
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
  var context = this; // saving context
  var errors  = [];   // list of errors

  // nbItem error on load
  var nbItems = {
    total     : 0,
    processed : 0
  };

  // default statement
  return new Promise(function (fulfill, reject) {
    // check model definition & controller first
    var model = glob.sync('*.json', {
      cwd       : context.paths.model,
      realpath  : true
    });

    // define validator Schema
    var vschema = joi.object().keys({
      model : joi.object().keys({
        name        : joi.string().required(),
        properties  : joi.object().required(),
        crud        : joi.object().keys({
          enable  : joi.boolean().required(),
          exclude : joi.array().empty()
        }).allow('enable', 'exclude'),
        validator   : joi.string().optional(),
      }).unknown()
    }).unknown();

    // create execution queue with 100 concurrency
    var queue = async.queue(function (task, callback) {
      // validate
      var status = joi.validate(task.data, vschema);

      // has error ?
      if (!_.isNull(status.error)) {
        // default error message
        var message = [ 'Invalid schema for [', task.file, '] Error is :',
                        status.error ].join(' ');
        // warning message
        context.logger.warning([ '[ YMongoose.load.queue ] -', message ].join(' '));
        // callback with error
        callback(message);
      } else {
        // add new model
        var created = context.addModel(task.data);

        // model is created ?
        if (!created) {
          // callback with error
          callback([ 'Cannot create model for  [', task.file, ']' ].join(' '));
        } else {
          // change nb added items value
          nbItems.processed++;
          // normal process all is ok
          callback();
        }
      }
    }, 100);

    // Callback at the end of queue processing
    queue.drain = function () {
      // message drain ending
      context.logger.info('[ YMongoose.load.queue.drain ] - Process Queue Complete.');
      // build statistics
      context.logger.debug([ '[ YMongoose.load.queue.drain ] - Statistics -',
                            '[ Added on queue :', nbItems.total,
                            (nbItems.total > 1) ? 'items' : 'item', '] -',
                            '[ Processed :', nbItems.processed,
                            (nbItems.processed > 1) ? 'items' : 'item', '] -',
                            '[ Errors :', errors.length,
                            (errors.length > 1) ? 'items' : 'item',']' ].join(' '));
      // changed loaded status
      context.loaded = (nbItems.processed === nbItems.total);
      // all is processed ?
      if (context.loaded) {
        // success message
        context.logger.info('[ YMongoose.load.queue.drain ] - All item was processed.');
        // all is ok so fulfill
        fulfill();
      } else {
        // all was not processed
        context.logger.error([ '[ YMongoose.load.queue.drain ] -',
                               'All item was NOT correctly processed.',
                               'Check your logs.' ].join(' ')
                            );
        // reject
        reject();
        // disconnect error occured
        context.disconnect();
      }
    };

    // run each model
    _.each(model, function (m) {
      // try & catch error
      try {
        // build file name
        var name = m.replace(path.dirname(m), '');
        // parsed file
        var parsed = JSON.parse(fs.readFileSync(m, 'utf-8'));
        // increment counter
        nbItems.total++;
        // parsed not failed push to queue
        queue.push({ file : name, data : parsed }, function (error) {
          // has error ?
          if (error) {
            // log error message
            context.logger.warning([ '[ YMongoose.load ] - Cannot add item to queue for [',
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
          reject(message);
          // disconnect
          this.disconnect();
        }
      }
    }, context);
  });
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

/**
 * Add new static on added model
 *
 * @param {String} model model name to retreive for adding
 * @param {String} name function name to use for adding
 * @param {Function} fn function reference to use for adding
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.addStatic = function (model, name, fn) {
  // default statement
  return this.addFn(model, name, fn, false);
};

/**
 * Add new method on added model
 *
 * @param {String} model model name to retreive for adding
 * @param {String} name function name to use for adding
 * @param {Function} fn function reference to use for adding
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.addMethod = function (model, name, fn) {
  // default statement
  return this.addFn(model, name, fn, true);
};

/**
 * Add new method or static on added model
 *
 * @param {String} model model name to retreive for adding
 * @param {String} name function name to use for adding
 * @param {Function} fn function reference to use for adding
 * @param {Boolean} methods true if we need method otherwise static
 * @return {Boolean} true if all is ok false otherwise
 */
YMongoose.prototype.addFn = function (model, name, fn, methods) {
  // define default type to use
  methods = _.isBoolean(methods) && methods ? 'method' : 'static';

  // is ready ??
  if (this.isReady(true) && this.isLoaded() &&
      _.isFunction(fn) && _.isString(model) && !_.isEmpty(model) &&
      _.isString(name) && !_.isEmpty(name)) {

    // check valid method name
    var retreive = this.getModel(model);

    // retreive model ??
    if (retreive) {
      // get schema
      var schema = retreive.schema;

      // fn name does already exists ?
      if (!_.isFunction(schema.statics[name])) {
        // add static method
        schema[methods](name, fn);
        // delete existing model before new changes
        delete this.mongoose.models[model];
        // create new model with new elements
        this.mongoose.model(model, schema);

        // valid statement
        return true;
      } else {
        // warning message
        this.logger.warning([ '[ YMongoose.addFn ] - Cannot add ', methods, ' on ', model, '.',
                              ' Given method [ ', name, ' ] already exists' ].join(''));
      }
    } else {
      // log error
      this.logger.error([ '[ YMongoose.addFn ] - Cannot add', methods,
                          'Search model is not found' ].join(' '));
    }
  } else {
    // error here
    this.logger.error([ '[ YMongoose.addFn ] - Cannot add new method.',
                          'Invalid name or given Function is not valid' ].join(' '));
  }

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
