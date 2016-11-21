'use strict';

var logger    = require('yocto-logger');
var _         = require('lodash');
var utils     = require('yocto-utils');
var Redis     = require('ioredis');
var joi       = require('joi');
var Q         = require('q');
var fs        = require('fs');

/**
 *
 * Manage all validator action from a valid given schema
 *
 * @date : 10/04/2016
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @class RedisUtils
 */
function RedisUtils (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger     = logger;
  /**
   * Default host to use
   *
   * @type {Array}
   * @default [ { host : '127.0.0.1', port : 6379 } ]
   */
  this.hosts      = [ { host : '127.0.0.1', port : 6379 } ];
  /**
   * Default additional option config
   */
  this.options    = { retry : 2000, enableReadyCheck : true };
  /**
   * Default state of elastic config
   *
   * @type {Boolean}
   * @default false
   */
  this.isReady = false;
  /**
   * Default cluster
   */
  this.cluster = null;
  /**
   * Default expire time
   */
  this.defaultExpireTime = 0;
}

/**
 * Get default hosts for connection
 *
 * @return {Array} list of hosts to use
 */
RedisUtils.prototype.getHosts = function () {
  // default statement
  return this.hosts;
};

/**
 * Get default options for connection
 *
 * @return {Object} list of options to use
 */
RedisUtils.prototype.getOptions = function () {
  // default statement
  return this.options;
};

/**
 * Process redis disconnect action
 */
RedisUtils.prototype.disconnect = function () {
  // process disconnect
  return !_.isNull(this.cluster) ? this.cluster.disconnect() : false;
};

/**
 * Default method to define if hosts is defined
 *
 * @param {Array} hosts an array of hosts given
 * @param {Object} options property to set on options
 * @param {Number} defaultExpireTime to force the default expire time for all of insertion
 * @param {Boolean} cluster set to true if we need to use a cluster connection
 * @return {Boolean} true if all if ok false otherwise
 */
RedisUtils.prototype.connect = function (hosts, options, defaultExpireTime, cluster) {
  // validation schema
  var schema = joi.array().required().items(
    joi.object().keys({
      host      : joi.string().required().empty().default('127.0.0.1'),
      family    : joi.number().optional().valid([ 4, 6 ]),
      password  : joi.string().optional().empty().min(32),
      db        : joi.number().optional(),
      port      : joi.number().required().default(6380),
      tls       : joi.object().optional().keys({
        ca      : joi.string().optional().empty(),
        key     : joi.string().optional().empty(),
        cert    : joi.string().optional().empty(),
      })
    }).default({ host : '127.0.0.1', port : 6380 })
  ).default([ { host : '127.0.0.1', port : 6380 } ]);

  // validate given config
  var validate = joi.validate(hosts, schema);

  // has error ?
  if (validate.error) {
    // log error message
    this.logger.warning([ '[ RedisUtils.connect ] - Invalid host config given :',
                          validate.error ] .join(' '));
    // default invalid statement
    return false;
  }

  // set default expire time
  if (_.isNumber(defaultExpireTime) && defaultExpireTime > 0) {
    // add new value of expire time if is not define on request
    this.defaultExpireTime = defaultExpireTime;
  }

  // set hosts config
  this.hosts    = validate.value;
  // save givent options, this value will be merge before the connection
  this.options  = _.merge(this.options, (options || {}));

  // has an default expire times ?
  if (_.has(this.options, 'retry') && _.isNumber(this.options.retry)) {
    // add retry strategy code
    _.extend(this.options, { clusterRetryStrategy : function () {
      // default statement
      return this.options.retry;
    }.bind(this) });
  }

  // has tls ca defined ?
  if (_.has(this.hosts, 'tls.ca')) {
    // define ca
    this.hosts.tls.ca = [ fs.readFileSync(this.hosts.tls.ca) ];
  }

  // has tls ca defined ?
  if (_.has(this.hosts, 'tls.key')) {
    // define ca
    this.hosts.tls.key = fs.readFileSync(this.hosts.tls.key);
  }

  // has tls ca defined ?
  if (_.has(this.hosts, 'tls.cert')) {
    // define ca
    this.hosts.tls.cert = fs.readFileSync(this.hosts.tls.cert);
  }

  // is cluster mode ?
  if (_.isBoolean(cluster) && cluster) {
    // info message
    this.logger.info('[ RedisUtils.connect ] - Try to connect in a cluster mode');
    // default redis options
    this.cluster = new Redis.Cluster(this.hosts, this.options);
  } else {
    // get default config value
    var params = _.first(validate.value);
    // info message
    this.logger.info('[ RedisUtils.connect ] - Try to connect in classic mode');

    // has more than one items ?
    if (_.size(validate.value) > 1) {
      // warning message
      this.logger.warning([ '[ RedisUtils.connect ] - Redis is not starting on cluster mode',
                            'connections parameters used will be the first item of current config.'
                          ].join(' '));
    }

    // default redis options
    this.cluster = new Redis(params);
  }

  // define event
  return this.listenEvents();
};

/**
 * A default method to normalize given key before save on redis db
 *
 * @param {Mixed} key wanted key for storage
 * @return {String} given key normalized
 */
RedisUtils.prototype.normalizeKey = function (key) {
  // default statement
  return _.snakeCase(_.deburr(JSON.stringify(key))).toLowerCase();
};

/**
 * An alias method for default add method
 *
 * @param {String} key key to use for storage
 * @param {Mixed} value default value to store on database
 * @param {Number} expire expires times to set for current key/value
 * @return {Object} default promise to catch
 */
RedisUtils.prototype.set = function (key, value, expire) {
  // default statement
  return this.add(key, value, expire);
};

/**
 * Add a value from given key on dabatase
 *
 * @param {String} key key to use for storage
 * @param {Mixed} value default value to store on database
 * @param {Number} expire expires times to set for current key/value
 * @return {Object} default promise to catch
 */
RedisUtils.prototype.add = function (key, value, expire) {
  // normalize expire time
  expire = _.isNumber(expire) && expire > 0 ? expire : this.defaultExpireTime;

  // normalize key
  key = this.normalizeKey(key);

  // is ready ?
  if (this.isReady) {
    // expire is a valid time
    if (expire > 0) {
      // log message
      this.logger.debug([ '[ RedisUtils.add ] - Adding key [',
        key, '] with [', expire, '] seconds of expires times,',
        'with value :', utils.obj.inspect(value) ].join(' '));
      // add with expire time
      this.cluster.set(key, JSON.stringify(value), 'EX', expire);
    } else {
      // log message
      this.logger.debug([ '[ RedisUtils.add ] - Adding key [',
        key, '] with value :', utils.obj.inspect(value) ].join(' '));
      // add without expire time
      this.cluster.set(key, JSON.stringify(value));
    }
  }

  // default statement
  return this.get(key);
};

/**
 * Remove a value found by his key
 *
 * @return {boolean} return success status of deleting
 */
RedisUtils.prototype.remove = function () {
  // create async process
  var deferred = Q.defer();

  // build properly all given keys and normalize it
  var keys = _.flatten(_.map(arguments));

  // is ready ?
  if (this.isReady) {
    // create a pipeline to process multiple delete
    var pipeline = this.cluster.pipeline();
    // parse all keys
    keys.forEach(function (key) {
      // prepare deletion
      pipeline.del(this.normalizeKey(key));
    }.bind(this));
    // exec pipeline
    pipeline.exec().then(function () {
      // log message
      this.logger.debug([ '[ RedisUtils.remove ] - Remove keys [',
        keys, ']', 'was processed' ].join(' '));
      // resolve promise
      deferred.resolve();
    }.bind(this));
  } else {
    // log message
    this.logger.warning([ '[ RedisUtils.remove ] - keys [',
      keys, '] was not removed because connection is down' ].join(' '));
  }

  // default statement
  return deferred.promise;
};

/**
 * Flush current database. If a given string pattern is a correct we use it
 *
 * @param {String} pattern if is defined we use this pattern otherwise than default pattern (*)
 * @return {Object} promise to catch
 */
RedisUtils.prototype.flush = function (pattern) {
  // create async process
  var deferred = Q.defer();

  // normalize properly pattern to use
  pattern  = _.isString(pattern) && !_.isEmpty(pattern) ? pattern : '*';

  // current size length, we use it to show a correct message on end stream/pipeline process.
  var sizes = 0;

  // create stream
  var stream = this.cluster.scanStream({
    match : pattern
  });

  // log message
  this.logger.debug('[ RedisUtils.flush ] - flush was starting.');

  // catch data on created stream
  stream.on('data', function (keys) {
    // change sizes valud for end process
    sizes += _.size(keys);
    // has items ?
    if (_.size(keys) > 0) {
      // process call with default method
      this.remove.call(this, keys);
    }
  }.bind(this));

  // when is finish what we do ?
  stream.on('end', function () {
    // no size ???
    if (sizes === 0) {
      // log message
      this.logger.debug([ '[ RedisUtils.flush ] - No keys found for given pattern [',
        pattern, (pattern === '*' ? '(Default) ]' : ']')].join(' '));
    }
    // log message
    this.logger.debug([ '[ RedisUtils.flush ] - flush was ending.',
      sizes, 'keys was removed' ].join(' '));
    // all is ok
    deferred.resolve();
  }.bind(this));

  // default statement
  return deferred.promise;
};

/**
 * An alias method for default remove method
 *
 * @return {Object} default promise to catch
 */
RedisUtils.prototype.delete = function () {
  // default statement
  return this.remove(_.flatten(_.map(arguments)));
};

/**
 * Get current value from given key
 *
 * @param {Mixed} key key to retreive on database
 * @return {Object} default promise to catch
 */
RedisUtils.prototype.get = function (key) {
  // create async process
  var deferred = Q.defer();

  // is ready ?
  if (!this.isReady) {
    // reject
    deferred.reject('Redis is not ready cannot process get action');
  } else {
    // get value
    this.cluster.get(this.normalizeKey(key), function (error, result) {
      // has error ?
      if (!error) {
        // result is null ?
        if (!_.isNull(result)) {
          // resolve with result
          deferred.resolve(JSON.parse(result));
        } else {
          // reject with null value
          deferred.resolve(result);
        }
      } else {
        // log error
        this.logger.error([ '[ RedisUtils.get ] - Cannot get value for key [',
          this.normalizeKey(key), '] on redis :', error ].join(' '));
        // reject with error
        deferred.reject(error);
      }
    }.bind(this));
  }
  // default statement
  return deferred.promise;
};

/**
 * Default method to enable listen on each redis events
 *
 * @return {Boolean} return true when event was binded
 */
RedisUtils.prototype.listenEvents = function () {
  // default events
  var events = [
    { key : 'connect', message      : 'is connecting' },
    { key : 'ready', message        : 'is ready' },
    { key : 'error', message        : 'errored' },
    { key : 'close', message        : 'is closing' },
    { key : 'reconnecting', message : 'is reconnecting' },
    { key : 'end', message          : 'is ending' },
    { key : '+node', message        : 'connecting to a new node' },
    { key : '-node', message        : 'disconnecting from a node' },
    { key : 'node error', message   : 'is on error on a node' }
  ];

  // parse all events
  _.each(events, function (e) {
    // catch all event
    this.cluster.on(e.key, function (message) {
      // is ready ?
      if (e.key === 'ready') {
        // change ready state value
        this.isReady = true;
      }
      // error event ? to change ready state
      if (_.includes([ 'error', 'close', 'reconnecting', 'end', 'node error' ], e.key)) {
        // change ready state value
        this.isReady = false;
      }
      // log message
      this.logger[ e.key !== 'ready' ? 'debug' : 'info' ]([
        '[ RedisUtils.listenEvents ] – Redis', e.message,
        (message ? [ '=>', message ].join(' ') : '')
      ].join(' '));
    }.bind(this));
  }.bind(this));

  // default statement
  return true;
};

// Default export
module.exports = function (l) {
  // is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ RedisUtils.constructor ] - Invalid logger given. Use internal logger');
    // assign
    l = logger;
  }
  // default statement
  return new (RedisUtils)(l);
};
