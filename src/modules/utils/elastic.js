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
 * @class ElasticUtils
 */
function ElasticUtils (logger) {
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
   * @default [ '127.0.0.1:9200' ]
   */
  this.hosts      = [ '127.0.0.1:9200' ];
  /**
   * Default additional option config
   */
  this.options    = {};
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
  // first test
  if (!obj || !_.isObject(obj)) {
    // default statement
    return obj;
  }

  // third test
  if (_.isArray(obj)) {
    // map
    return _.map(obj, this.addDefaultIndexes.bind(this));
  }

  // default statement
  return _.reduce(Object.keys(obj), function (acc, key) {
    // is Object ? so add elastic index
    if (_.isObject(obj[key])) {
      // add default elastic indexes
      _.merge(obj[key], utils.obj.underscoreKeys({ esIndexed : false }));
    }
    // set to current key
    acc[key] = this.addDefaultIndexes(obj[key]);

    // default statement
    return acc;
  }.bind(this), {});
};

/**
 * Get default hosts for connection
 *
 * @return {Array} list of hosts to use
 */
ElasticUtils.prototype.getHosts = function () {
  // default statement
  return this.hosts;
};

/**
 * Get default options for connection
 *
 * @return {Object} list of options to use
 */
ElasticUtils.prototype.getOptions = function () {
  // default statement
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
  // is valid before set ?
  if (_.isArray(hosts) && !_.isEmpty(hosts)) {
    // set hosts config
    this.hosts    = hosts;
    // save givent options, this value will be merge before the connection
    this.options  = options || {};
    // change state of ready
    this.isReady  = true;
    // default valid statement
    return true;
  }

  // default statement
  return false;
};

/**
 * Get current state of elastic config
 *
 * @return {Boolean} true if is ready false otherwise
 */
ElasticUtils.prototype.configIsReady = function () {
  // default statement
  return this.isReady;
};

// Default export
module.exports = function (l) {
  // is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ ElasticUtils.constructor ] - Invalid logger given. Use internal logger');
    // assign
    l = logger;
  }
  // default statement
  return new (ElasticUtils)(l);
};
