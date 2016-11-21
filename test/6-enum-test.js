/**
 * Unit tests
 */
var chai    = require('chai').assert;
var expect  = require('chai').expect;
var should  = require('chai').should();
var _       = require('lodash');
var utils   = require('yocto-utils');
var logger  = require('yocto-logger');
var db      = require('../src/')(logger);
var path    = require('path');

// disable console
logger.disableConsole();

var paths = [
  { key : 'models', path : './example/models' },
  { key : 'methods', path : './example/methods' },
  { key : 'enums', path : './example/enums' },
  { key : 'validators', path : './example/controllers' }
];


describe('Enums process ->', function () {
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

  // build paths
  _.each(paths, function (p) {
    it ([ 'Setting', p.key, 'paths sould be return true' ].join(' '), function () {
      var model = db[p.key](p.path);
      expect(model).to.be.a('boolean');
      expect(model).equal(true);
      expect(db.paths[p.key.replace(p.key !== 'enums' ? 's' : '', '')]).to.be.not.empty;
      expect(db.paths[p.key.replace(p.key !== 'enums' ? 's' : '', '')]).to.be.a('string');
    });
  });

  it ('Database should be to an ready state', function () {
    expect(db.isReady()).to.be.a('boolean');
    expect(db.isReady()).equal(true);
  });

  it ('Model must be load property if database is ready', function (done) {
    // clean data before load mongoose already compiled on unit test
    db.mongoose.models = {};
    db.mongoose.modelSchemas = {};
    // then load
    db.load().then(function() {
      expect(db.isLoaded()).to.be.a('boolean');
      expect(db.isLoaded()).equal(true);
      done();
    })
  });

  it ('Must return a valid enums list', function () {
    var model = db.getModel('Account');
    expect(model).to.be.a('function');

    // get available enums
    var enums = model.enums().get('notify_type_list');
    expect(enums).to.be.a('array');
    expect(enums).to.be.not.empty;
  });

  it ('Must acces to mongooseType on model', function () {
    var model = db.getModel('Account');
    expect(model).to.be.a('function');

    // get available enums
    var enums = model.enums().get('notify_type_list');
    expect(enums).to.be.a('array');
    expect(enums).to.be.not.empty;
    expect(model.enums().types).to.be.a('object');
    expect(model.enums().types.Array).to.be.a('function');
    expect(model.enums().types.Buffer).to.be.a('function');
    expect(model.enums().types.Buffer.Binary).to.be.a('function');
    expect(model.enums().types.Embedded).to.be.a('function');
    expect(model.enums().types.Document).to.be.a('function');
    expect(model.enums().types.DocumentArray).to.be.a('function');
    expect(model.enums().types.ObjectId).to.be.a('function');
    expect(model.enums().types.Subdocument).to.be.a('function');
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
