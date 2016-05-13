'use strict';

var Q = require('q');

// valid account schema
exports.test1 = function(data) {
  var deferred = Q.defer();
  console.log(this.get);
  console.log('test1');
  this.get('57346d1d1ae4d6950ee0fd28', { foo : 'bar' } );
//  console.log('redis Instance', this.redis());
//  console.log('redis Expire time', this.redis());
  console.log(arguments);
  //deferred.resolve('Yeahhhh');
  // test redis
  /*this.redis().instance.add('aaa', { foo : 'abar' }, this.redis().expire);
  this.redis().instance.get('aaa').then(function (success) {
    console.log('r ssuccss =>', success);
  }).catch(function (error) {
    console.log('r erro =>', error);
  });*/
  return deferred.promise;
};

exports.test2 = function(data) {
  console.log('test2');
};

exports.saveTest =  function (doc) {
  console.log('dans save Test =>', doc);
  console.log(arguments);
};