var Q = require('q');

// valid account schema
exports.test1 = function(data) {
  var deferred = Q.defer();

  console.log('test1');
  deferred.resolve('Yeahhhh');

  return deferred.promise;
};

exports.test2 = function(data) {
  console.log('test2');
};