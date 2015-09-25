var utils     = require('yocto-utils');
var logger    = require('yocto-logger');
var mongoose  = require('mongoose');
var _         = require('lodash');
var Promise   = require('promise');
var path      = require('path');
var fs        = require('fs');
var glob      = require('glob');
var joi       = require('joi');
var async     = require('async');
/**
 *
 * Manage Crud function for adding model
 *
 * @date : 25/09/2015
 * @author : Mathieu ROBERT <mathieu@yocto.re>
 * @copyright : Yocto SAS, All right reserved
 *
 * @class Crud
 */
function Crud (logger) {
  /**
   * Logger instance
   *
   * @property logger
   */
  this.logger   = logger;
}

// Default export
module.exports = function (l) {
  // is a valid logger ?
  if (_.isUndefined(l) || _.isNull(l)) {
    logger.warning('[ Crud.constructor ] - Invalid logger given. Use internal logger');
    // assign
    l = logger; 
  }
  // default statement
  return new (Crud)(l);
};