/**
 * Unit tests
 */
var chai    = require('chai').assert;
var expect  = require('chai').expect;
var _       = require('lodash');
var utils   = require('yocto-utils');
var logger  = require('yocto-logger');
var db      = require('../src/')(logger);
var path    = require('path');

// disable console
logger.disableConsole();

describe('Elastic search ->', function () {
  // change timeout connection
  this.timeout(5000);
  it ('Should can connect on test database host on 127.0.0.0:27017', function (done) {
    db.connect('mongodb://localhost:27017/test').then(function() {
      expect(db.isConnected()).to.be.a('boolean');
      expect(db.isConnected()).equal(true);
      expect(db.isDisconnected()).to.be.a('boolean');
      expect(db.isDisconnected()).equal(false);
      done();
    });
  });

  it ('Adding valid elastic hosts on configuration must return true', function () {
    var state = db.enableElasticsearch([
      { host : '127.0.0.1', port : 9200 },
      { host : '127.0.0.1', port : 9500 }
    ]);
    expect(state).to.be.a('boolean');
    expect(state).equal(true);
  });

  it ('Adding invalid elastic hosts on configuration must return false', function () {
    _.each(utils.unit.generateTypeForUnitTests(null, 1), function (u) {
      var state = db.enableElasticsearch(u);
      expect(state).to.be.a('boolean');
      expect(state).equal(false);
    });
  });

  it ('Should be disconnect properly from current connected host', function (disco) {
    db.disconnect().then(function () {
      expect(db.isConnected()).to.be.a('boolean');
      expect(db.isConnected()).equal(false);
      expect(db.isDisconnected()).to.be.a('boolean');
      expect(db.isDisconnected()).equal(true);
      disco();
    });
  });
});
