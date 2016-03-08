"use strict";
var joi = require('joi');

// valid account schema
exports.card = function(data) {
  return joi.object().keys({
    a : joi.string()
  });
};
