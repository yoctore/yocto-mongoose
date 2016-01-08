var Q = require('q');

// valid account schema
exports.test1 = function(data) {
  var deferred = Q.defer();
console.log(this.get);
  console.log('test1');
  console.log(arguments);
  deferred.resolve('Yeahhhh');

  return deferred.promise;
};

exports.test2 = function(data) {
  console.log('test2');
};

exports.saveTest =  function (doc) {
  console.log('dans save Test =>', doc);
};