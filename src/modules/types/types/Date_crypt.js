'use strict';

var mongoose = require('mongoose');
var _        = require('lodash');
var moment   = require('moment');

// Contains modules
var modules = [];

/**
* Types Date crypt
* Convert Crypto string to Date when get data
*
* @param       {String} key     key
* @param       {Object} options Options
* @constructor
*/
function DateCrypt (key, options) {
  // Create Types
  mongoose.SchemaType.call(this, key, options, 'Date_crypt');
}

// Create prototype methods
DateCrypt.prototype = Object.create(mongoose.SchemaType.prototype);

/**
 * Add Cast method when get data
 *
 * @param  {String}  value       Value retrieved
 * @param  {[type]}  doc         [description]
 * @param  {Boolean} isGetMethod [description]
 * @return {Object}  Date or null
 */
DateCrypt.prototype.cast = function (value, doc, isGetMethod) {
  // Result
  var castedValue = null;

  try {
    // Check if is get & if value is not null
    if (isGetMethod && !_.isNull(value)) {
      // Check if is object & already valid date
      if (_.isObject(value) && moment(value).isValid()) {
        // Already date Object so return value
        return value;
      } else if (!modules.crypt.isAlreadyCrypted(value)) {
        // Is not crypted & is not a Date
        throw new Error('[ Types.Date_crypt.cast ] - error when cast Date_crypt, the value : ' +
        value + 'can\'t be casted as Date');
      }

      // Try to decrypt value
      castedValue = modules.crypt.decrypt(value);

      // Try to convert to Date
      castedValue = new Date(castedValue);
    }
  } catch (error) {
    // Trow error
    throw new Error('[ Types.Date_crypt.cast ] - error when casting value : < ' + value +
    ' >, error : ', error);
  }

  // Return value converted if exist
  return _.isNull(castedValue) ? value : castedValue;
};

// Exports new types
module.exports = function (m) {
  // Set modules reference
  modules = m;

  // Return New Types
  return DateCrypt;
};
