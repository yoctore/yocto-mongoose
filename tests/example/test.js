var logger    = require('yocto-logger');
var db        = require('../../src/index.js')(logger);

// Connect
db.connect('localhost:27017').then(function() {
  // load models
  db.models('./tests/example/models');
  db.validators('./tests/example/controllers');
  if (db.isReady(true)) {
    db.load().then(function() {
      console.log('load success');
    }, function() {
      console.log('load error');
    });
  }
}, function(error) {
  if (db.isConnected()) {
    db.disconnect().then(function() {
  
    }, function(error) {
      console.log('diconnect failed');
      console.log(error);
    });
  }
});
