'use strict';

var Q = require('q');

// valid account schema
exports.test1 = function(data) {
  var deferred = Q.defer();
  //console.log(this.redis());
  //console.log('test1');
  //this.get(data, { foo : 'bar' } );
  //console.log('redis Instance', this.redis());
//  console.log('redis Expire time', this.redis());
  //console.log(arguments);
  deferred.resolve('Yeahhhh');
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
  var deferred = Q.defer();
  //console.log('test2');
  //this.get(data, { foo : 'bar' } );
  //console.log('redis Instance', this.redis());
//  console.log('redis Expire time', this.redis());
  //console.log(arguments);
  deferred.resolve('Yeahhhh');
  // test redis
  /*this.redis().instance.add('aaa', { foo : 'abar' }, this.redis().expire);
  this.redis().instance.get('aaa').then(function (success) {
    console.log('r ssuccss =>', success);
  }).catch(function (error) {
    console.log('r erro =>', error);
  });*/
  return deferred.promise;
};

exports.saveTest =  function (doc) {
  //console.log('dans save Test =>', doc);
  //console.log(arguments);
};

exports.post =  function (doc) {
  //console.log('dans post =>', doc);
  //console.log(arguments);
};

exports.pre =  function (doc) {
  //console.log('dans pre =>', doc);
  //console.log(arguments);
};