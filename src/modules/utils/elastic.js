'use strict';

var logger    = require('yocto-logger');
var _         = require('lodash');
var utils     = require('yocto-utils');

/**
 *
 * Manage all validator action from a valid given schema
 *
 * @date : 7/03/2016
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @param {Object} logger default logger intance
 * @class ElasticUtils
 */
function ElasticUtils (logger) {
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
   * @default [ '127.0.0.1:9200' ]
   */
  this.hosts = [ '127.0.0.1:9200' ];

  /**
   * Default additional option config
   */
  this.options = {};

  /**
   * Default state of elastic config
   *
   * @type {Boolean}
   * @default false
   */
  this.isReady = false;
}

/**
 * Default function to parse and object recursivly and add default elatic indexed on each object
 * By default elastic index all properties and we need to control this things
 *
 * @param {Object} obj default object to process
 * @return {Object} default object processed
 */
ElasticUtils.prototype.addDefaultIndexes = function (obj) {
  // First test
  if (!obj || !_.isObject(obj)) {
    // Default statement
    return obj;
  }

  // Third test
  if (_.isArray(obj)) {
    // Map
    return _.map(obj, this.addDefaultIndexes.bind(this));
  }

  // Default statement
  return _.reduce(Object.keys(obj), function (acc, key) {
    // Is Object ? so add elastic index
    if (_.isObject(obj[key])) {
      // Add default elastic indexes
      _.merge(obj[key], utils.obj.underscoreKeys({
        esIndexed : false
      }));
    }

    // Set to current key
    acc[key] = this.addDefaultIndexes(obj[key]);

    // Default statement
    return acc;
  }.bind(this), {});
};

/**
 * Get default hosts for connection
 *
 * @return {Array} list of hosts to use
 */
ElasticUtils.prototype.getHosts = function () {
  // Default statement
  return this.hosts;
};

/**
 * Get default options for connection
 *
 * @return {Object} list of options to use
 */
ElasticUtils.prototype.getOptions = function () {
  // Default statement
  return this.options;
};

/**
 * Default method to define if hosts is defined
 *
 * @param {Array} hosts an array of hosts given
 * @param {Object} options property to set on options
 * @return {Boolean} true if all if ok false otherwise
 */
ElasticUtils.prototype.enableHosts = function (hosts, options) {
  // Is valid before set ?
  if (_.isArray(hosts) && !_.isEmpty(hosts)) {
    // Set hosts config
    this.hosts = hosts;

    // Save givent options, this value will be merge before the connection
    this.options = options || {};

    // Change state of ready
    this.isReady = true;

    // Default valid statement
    return true;
  }

  // Default statement
  return false;
};

/**
 * Get current state of elastic config
 *
 * @return {Boolean} true if is ready false otherwise
 */
ElasticUtils.prototype.configIsReady = function () {
  // Default statement
  return this.isReady;
};

// Default export
module.exports = function (l) {
  // Is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ ElasticUtils.constructor ] - Invalid logger given. Use internal logger');

    // Assign
    l = logger;
  }

  // Default statement
  return new ElasticUtils(l);
};
