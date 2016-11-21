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
var async   = require('async');

// disable console
logger.disableConsole();

describe('Redis ->', function () {
  // change timeout connection
  //this.timeout(5000);
  it ('Should can connect on test database host on 127.0.0.0:27017', function (done) {
    db.connect('mongodb://localhost:27017/test').then(function() {
      expect(db.isConnected()).to.be.a('boolean');
      expect(db.isConnected()).equal(true);
      expect(db.isDisconnected()).to.be.a('boolean');
      expect(db.isDisconnected()).equal(false);
      done();
    });
  });

  it ('Adding valid redis hosts on configuration must return true', function () {
    var state = db.enableRedis([
      { host : '127.0.0.1', port : 6379 },
      { host : '127.0.0.1', port : 6379 }
    ]);

    expect(state).to.be.a('boolean');
    expect(state).equal(true);
  });

  it ('Adding invalid redis hosts on configuration must return false', function () {
    _.each(utils.unit.generateTypeForUnitTests(null, 1), function (u) {
      var state = db.enableRedis(u);
      expect(state).to.be.a('boolean');
      expect(state).equal(false);
    });
  });

  it ('Adding key(s) with method add or set should be succeed', function (done) {
    async.eachSeries([
      { key : 'Key-One-String-Value', value : 'MyValueForMyNewKey without expire time', expire : 0 },
      { key : 'Key-Two-String-Value', value : 'MyValueForMyNewKey with expire time', expire : 10 },
      { key : 'Key-Two-Object-Value', value : { key : 'ObjectKey', foo : 'bar' }, expire : 10 }
    ], function (e, next) {
      // try to add key
      db.getRedis().add(e.key, e.value, e.expire || 0).then(function(success) {
        expect(success).to.be.a('object');
        expect(success).to.not.empty;
        next();
      }).catch(function (error) {
        next();
      })
    }, function () {
      // end
      done();
    });
  });

  it ('Getting value with added key(s) should be succeed', function (done) {
    async.eachSeries([
      { key : 'Key-One-String-Value', value : 'MyValueForMyNewKey without expire time', expire : 0 },
      { key : 'Key-Two-String-Value', value : 'MyValueForMyNewKey with expire time', expire : 10 },
      { key : 'Key-Two-Object-Value', value : { key : 'ObjectKey', foo : 'bar' }, expire : 10 }
    ], function (e, next) {
      // try to add key
      db.getRedis().get(e.key).then(function(success) {
        expect(success).to.be.a(typeof e.value);
        expect(success).to.not.empty;
        next();
      }).catch(function (error) {
        next();
      })
    }, function () {
      // end
      done();
    });
  });

  it ('Should remove an existing keys with method < delete >', function (done) {
    // add key
    db.getRedis().add('Key-Test-delete', { type : 'test' }, 60);

    // remove key
    db.getRedis().delete('Key-Test-delete').then(function () {
      // try to retrieve the deleted key
      db.getRedis().get('Key-Test-delete').then(function (result) {
        expect(result).equal(null);
        done();
      }).catch(function (error) {
      }) ;
    });
  });


  it ('Should remove an existing keys with method < delete > with multiple arguments', function (done) {
    this.timeout(5000);
    // default items
    var items = [];

    // build item to remove
    for (var i = 0; i < 10; i++) {
      items.push('Key-Test-delete-remove_'+i);
    }

    async.eachSeries(items, function (i, next) {
      // add key
      db.getRedis().add(i, { type : 'test' });
      // next item
      next();
    }, function () {
      db.getRedis().delete.call(db.getRedis(), items).then(function () {
        // try to retrieve the deleted key
        // process each series
        var citems = items;
        async.eachSeries(citems, function (i, inext) {
          // try to retrieve the deleted key
          db.getRedis().get(i).then(function (item) {
            expect(item).equal(null);
            items = _.contact(citems.shift());
            inext();
          }).catch(function (error) {
            inext();
          });
        }, function () {
          expect(items).to.be.empty;
          done();
        });
      });
    });
  });


  it ('Should remove an existing keys with method < delete >', function (done) {
    // add key
    db.getRedis().add('Key-Test-delete', { type : 'test' }, 60);

    // remove key
    db.getRedis().remove('Key-Test-delete').then(function () {
      // try to retrieve the deleted key
      db.getRedis().get('Key-Test-delete').then(function (result) {
        expect(result).equal(null);
        done();
      }).catch(function (error) {
      }) ;
    });
  });


  it ('Should remove an existing keys with method < remove > with multiple arguments', function (done) {
    this.timeout(5000);
    // default items
    var items = [];

    // build item to remove
    for (var i = 0; i < 10; i++) {
      items.push('Key-Test-delete-remove_'+i);
    }

    async.eachSeries(items, function (i, next) {
      // add key
      db.getRedis().add(i, { type : 'test' });
      // next item
      next();
    }, function () {
      db.getRedis().remove.call(db.getRedis(), items).then(function () {
        // try to retrieve the deleted key
        // process each series
        var citems = items;
        async.eachSeries(citems, function (i, inext) {
          // try to retrieve the deleted key
          db.getRedis().get(i).then(function (item) {
            expect(item).equal(null);
            items = _.contact(citems.shift());
            inext();
          }).catch(function (error) {
            inext();
          });
        }, function () {
          expect(items).to.be.empty;
          done();
        });
      });
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
