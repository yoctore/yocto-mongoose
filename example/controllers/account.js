"use strict";
var joi = require('joi');

// valid account schema
exports.account = function(data) {
  return joi.object().keys({
    name : joi.string().required().empty(),
    test : joi.string().required().empty(),
  });
};
