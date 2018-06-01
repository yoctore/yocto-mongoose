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
 * @param {Object} logger default logger intance
 * @class RedisUtils
 */
function RedisUtils (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger = logger;

  /**
   * Default host to use
   *
   * @type {Array}
   * @default [ { host : '127.0.0.1', port : 6379 } ]
   */
  this.hosts = [ {
    host : '127.0.0.1',
    port : 6379
  } ];

  /**
   * Default additional option config
   */
  this.options = {
    retry            : 2000,
    enableReadyCheck : true
  };

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
  // Default statement
  return this.hosts;
};

/**
 * Get default options for connection
 *
 * @return {Object} list of options to use
 */
RedisUtils.prototype.getOptions = function () {
  // Default statement
  return this.options;
};

/**
 * Process redis disconnect action
 *
 * @return {Boolean} true in case of success of disconnect, false otherwise
 */
RedisUtils.prototype.disconnect = function () {
  // Process disconnect
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
  // Validation schema
  var schema = joi.array().required().items(
    joi.object().keys({
      host     : joi.string().required().empty().default('127.0.0.1'),
      family   : joi.number().optional().valid([ 4, 6 ]),
      password : joi.string().optional().empty().min(32),
      db       : joi.number().optional(),
      port     : joi.number().required().default(6380),
      tls      : joi.object().optional().keys({
        ca   : joi.string().optional().empty(),
        key  : joi.string().optional().empty(),
        cert : joi.string().optional().empty()
      })
    }).default({
      host : '127.0.0.1',
      port : 6380
    })
  ).default([ {
    host : '127.0.0.1',
    port : 6380
  } ]);

  // Validate given config
  var validate = joi.validate(hosts, schema);

  // Has error ?
  if (validate.error) {
    // Log error message
    this.logger.warning([ '[ RedisUtils.connect ] - Invalid host config given :',
      validate.error ].join(' '));

    // Default invalid statement
    return false;
  }

  // Set default expire time
  if (_.isNumber(defaultExpireTime) && defaultExpireTime > 0) {
    // Add new value of expire time if is not define on request
    this.defaultExpireTime = defaultExpireTime;
  }

  // Set hosts config
  this.hosts = validate.value;

  // Save givent options, this value will be merge before the connection
  this.options = _.merge(this.options, options || {});

  // Has an default expire times ?
  if (_.has(this.options, 'retry') && _.isNumber(this.options.retry)) {
    // Add retry strategy code
    _.extend(this.options, {
      clusterRetryStrategy : function () {
      // Default statement
        return this.options.retry;
      }.bind(this)
    });
  }

  // Has tls ca defined ?
  if (_.has(this.hosts, 'tls.ca')) {
    // Define ca
    this.hosts.tls.ca = [ fs.readFileSync(this.hosts.tls.ca) ];
  }

  // Has tls ca defined ?
  if (_.has(this.hosts, 'tls.key')) {
    // Define ca
    this.hosts.tls.key = fs.readFileSync(this.hosts.tls.key);
  }

  // Has tls ca defined ?
  if (_.has(this.hosts, 'tls.cert')) {
    // Define ca
    this.hosts.tls.cert = fs.readFileSync(this.hosts.tls.cert);
  }

  // Is cluster mode ?
  if (_.isBoolean(cluster) && cluster) {
    // Info message
    this.logger.info('[ RedisUtils.connect ] - Try to connect in a cluster mode');

    // Default redis options
    this.cluster = new Redis.Cluster(this.hosts, this.options);
  } else {
    // Get default config value
    var params = _.first(validate.value);

    // Info message

    this.logger.info('[ RedisUtils.connect ] - Try to connect in classic mode');

    // Has more than one items ?
    if (_.size(validate.value) > 1) {
      // Warning message
      this.logger.warning([ '[ RedisUtils.connect ] - Redis is not starting on cluster mode',
        'connections parameters used will be the first item of current config.'
      ].join(' '));
    }

    // Default redis options
    this.cluster = new Redis(params);
  }

  // Define event
  return this.listenEvents();
};

/**
 * A default method to normalize given key before save on redis db
 *
 * @param {Mixed} key wanted key for storage
 * @return {String} given key normalized
 */
RedisUtils.prototype.normalizeKey = function (key) {
  // Default statement
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
  // Default statement
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
  // Normalize expire time
  expire = _.isNumber(expire) && expire > 0 ? expire : this.defaultExpireTime;

  // Try to auto crypt data if crypto is enabled
  value = this.crypto().redisPlainEncryptDecrypt(value, true);

  // Normalize key
  key = this.normalizeKey(key);

  // Is ready ?
  if (this.isReady) {
    // Expire is a valid time
    if (expire > 0) {
      // Log message
      this.logger.debug([ '[ RedisUtils.add ] - Adding key [',
        key, '] with [', expire, '] seconds of expires times,',
        'with value :', utils.obj.inspect(value) ].join(' '));

      // Add with expire time
      this.cluster.set(key, JSON.stringify(value), 'EX', expire);
    } else {
      // Log message
      this.logger.debug([ '[ RedisUtils.add ] - Adding key [',
        key, '] with value :', utils.obj.inspect(value) ].join(' '));

      // Add without expire time
      this.cluster.set(key, JSON.stringify(value));
    }
  }

  // Default statement
  return this.get(key);
};

/**
 * Remove a value found by his key
 *
 * @return {boolean} return success status of deleting
 */
RedisUtils.prototype.remove = function () {
  // Create async process
  var deferred = Q.defer();

  // Build properly all given keys and normalize it
  var keys = _.flatten(_.map(arguments));

  // Is ready ?
  if (this.isReady) {
    // Create a pipeline to process multiple delete
    var pipeline = this.cluster.pipeline();

    // Parse all keys

    keys.forEach(function (key) {
      // Prepare deletion
      pipeline.del(this.normalizeKey(key));
    }.bind(this));

    // Exec pipeline
    pipeline.exec().then(function () {
      // Log message
      this.logger.debug([ '[ RedisUtils.remove ] - Remove keys',
        utils.obj.inspect(keys), 'was processed' ].join(' '));

      // Resolve promise
      deferred.resolve();
    }.bind(this));
  } else {
    // Log message
    this.logger.warning([ '[ RedisUtils.remove ] - keys [',
      keys, '] was not removed because connection is down' ].join(' '));
  }

  // Default statement
  return deferred.promise;
};

/**
 * Flush current database. If a given string pattern is a correct we use it
 *
 * @param {String} pattern if is defined we use this pattern otherwise than default pattern (*)
 * @return {Object} promise to catch
 */
RedisUtils.prototype.flush = function (pattern) {
  // Create async process
  var deferred = Q.defer();

  // Normalize properly pattern to use
  pattern = _.isString(pattern) && !_.isEmpty(pattern) ? pattern : '*';

  // Current size length, we use it to show a correct message on end stream/pipeline process.
  var sizes = 0;

  // Create stream
  var stream = this.cluster.scanStream({
    match : pattern
  });

  // Log message
  this.logger.debug('[ RedisUtils.flush ] - flush was starting.');

  // Catch data on created stream
  stream.on('data', function (keys) {
    // Change sizes valud for end process
    sizes += _.size(keys);

    // Has items ?
    if (_.size(keys) > 0) {
      // Process call with default method
      this.remove(keys);
    }
  }.bind(this));

  // When is finish what we do ?
  stream.on('end', function () {
    // No size ???
    if (sizes === 0) {
      // Log message
      this.logger.debug([ '[ RedisUtils.flush ] - No keys found for given pattern [',
        pattern, pattern === '*' ? '(Default) ]' : ']' ].join(' '));
    }

    // Log message
    this.logger.debug([ '[ RedisUtils.flush ] - flush was ending.',
      sizes, 'keys was removed' ].join(' '));

    // All is ok
    deferred.resolve();
  }.bind(this));

  // Default statement
  return deferred.promise;
};

/**
 * An alias method for default remove method
 *
 * @return {Object} default promise to catch
 */
RedisUtils.prototype.delete = function () {
  // Default statement
  return this.remove(_.flatten(_.map(arguments)));
};

/**
 * Get current value from given key
 *
 * @param {Mixed} key key to retreive on database
 * @return {Object} default promise to catch
 */
RedisUtils.prototype.get = function (key) {
  // Create async process
  var deferred = Q.defer();

  // Is ready ?
  if (!this.isReady) {
    // Reject
    deferred.reject('Redis is not ready cannot process get action');
  } else {
    // Get value
    this.cluster.get(this.normalizeKey(key), function (error, result) {
      // Has error ?
      if (!error) {
        // Result is null ?
        if (!_.isNull(result)) {
          // Try to auto crypt data if crypto is enabled
          // Resolve with result
          deferred.resolve(this.crypto().redisPlainEncryptDecrypt(JSON.parse(result), false));
        } else {
          // Reject with null value
          deferred.reject(key);
        }
      } else {
        // Log error
        this.logger.error([ '[ RedisUtils.get ] - Cannot get value for key [',
          this.normalizeKey(key), '] on redis :', error ].join(' '));

        // Reject with error
        deferred.reject(error);
      }
    }.bind(this));
  }

  // Default statement
  return deferred.promise;
};

/**
 * Default method to enable listen on each redis events
 *
 * @return {Boolean} return true when event was binded
 */
RedisUtils.prototype.listenEvents = function () {
  // Default events
  var events = [
    {
      key     : 'connect',
      message : 'is connecting'
    },
    {
      key     : 'ready',
      message : 'is ready'
    },
    {
      key     : 'error',
      message : 'errored'
    },
    {
      key     : 'close',
      message : 'is closing'
    },
    {
      key     : 'reconnecting',
      message : 'is reconnecting'
    },
    {
      key     : 'end',
      message : 'is ending'
    },
    {
      key     : '+node',
      message : 'connecting to a new node'
    },
    {
      key     : '-node',
      message : 'disconnecting from a node'
    },
    {
      key     : 'node error',
      message : 'is on error on a node'
    }
  ];

  // Parse all events
  _.each(events, function (e) {
    // Catch all event
    this.cluster.on(e.key, function (message) {
      // Is ready ?
      if (e.key === 'ready') {
        // Change ready state value
        this.isReady = true;
      }

      // Error event ? to change ready state
      if (_.includes([ 'error', 'close', 'reconnecting', 'end', 'node error' ], e.key)) {
        // Change ready state value
        this.isReady = false;
      }

      // Log message
      this.logger[e.key !== 'ready' ? 'debug' : 'info']([
        '[ RedisUtils.listenEvents ] – Redis', e.message,
        message ? [ '=>', message ].join(' ') : ''
      ].join(' '));
    }.bind(this));
  }.bind(this));

  // Default statement
  return true;
};

// Default export
module.exports = function (l) {
  // Is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ RedisUtils.constructor ] - Invalid logger given. Use internal logger');

    // Assign
    l = logger;
  }

  // Default statement
  return new RedisUtils(l);
};
