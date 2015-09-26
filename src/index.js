var utils     = require('yocto-utils');
var logger    = require('yocto-logger');
var crud      = require('./modules/crud')(logger);
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
   */
  this.crud     = false;
}

/**
 * Check is currenct connection is connected
 *
 * @return {Boolean} true if is connected false otherwise
 */
YMongoose.prototype.isConnected = function () {
  // default statement
  return this.mongoose.connection.readyState == this.mongoose.Connection.STATES.connected;
};

/**
 * Check is current connection is disconnected
 *
 * @return {Boolean} true if is connected false otherwise
 */
YMongoose.prototype.isDisconnected = function () {
  // default statement
  return this.mongoose.connection.readyState == this.mongoose.Connection.STATES.disconnected;
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
    try  {
      // check access sync 
      var access  = fs.accessSync(directory, fs.R_OK);
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
      if (_.isEmpty(hasFile.length)) {
        this.logger.warning([ '[ YMongoose.setPath ] - Given directory path for',
                              (validator ? 'Validators' : 'Models'),
                              'seems to be empty.',
                              'Don\'t forget to ad your', (validator ? 'js' : 'json'),
                              'file before load call' ].join(' '));
      }

      // set data
      this.paths[ (validator ? 'validator' : 'model') ] = directory;
      // log message
      this.logger.info( [ '[ YMongoose.setPath ] -', (validator ? 'Validators' : 'Models'),
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
    var schema = new Schema(value.model.properties)

    // add crud ?
    if (value.model.crud.enable) {
      schema = this.createCrud(schema, value.model.crud.exclude);
    }

    // valid statement
    return this.mongoose.model(value.model.name, schema);
  }

  // default statement
  return false;
}

// TODO FINISH
// ADD TO CHANGELOG 
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

// TODO FINISH  
// ADD TO CHANGELOG 
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
        validator   : joi.string().required(),
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
        // TEST TO REMOVE
        created.get(1).then(function(a) {
          console.log('aaaaa');
          console.log(a);
          return created.getOne();
        }).then(function (e) {
          console.log('eeeee');
          console.log(e);
        }).catch(function(err) {
          console.log(err)
        }).done();
        // model is created ?
        if (!created) {
          // callback with error
          callback([ 'Cannot create model for  [', task.file, ']' ].join(' '));
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
                            '[ Errors :', (errors.length - 1),
                            (errors.length > 1) ? 'items' : 'item',']' ].join(' '));
      // all is processed ?
      if (nbItems.processed === nbItems.total) {
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
         if (_.last(model) == m && nbItems.total == 0) {
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

YMongoose.prototype.getModel = function (name) {
  // add a flag loaded + is connected and get model
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