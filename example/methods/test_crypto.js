'use strict';
//Fichier methodes
var Q = require('q');

exports.testGetRedis = function (redisKey) {
  // Create a promise deferred
  var deferred = Q.defer();

  var redis   = this.redis().instance;
  var expire  = this.redis().expire;

  // Get into Redis
  redis.get(redisKey).then(function (sucess) {
    // Key found into redis so resolve data
    deferred.resolve(sucess);
  }).catch(function () {
    // Not found
    deferred.reject();
  });

  // Return result of this methods
  return deferred.promise;
};

exports.testFlushAndInsertRedis = function (redisKey) {
  // Create a promise deferred
  var deferred = Q.defer();

  var redis   = this.redis().instance;
  var expire  = this.redis().expire;

  redis.delete(redisKey);

  redis.set(redisKey, {
    firstname : 'aaa',
    lastname  : 'bbb'
  }, 100000);

  // Key found into redis so resolve data
  deferred.resolve();

  // Return result of this methods
  return deferred.promise;
};
