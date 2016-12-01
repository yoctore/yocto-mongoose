/**
 * Unit tests
 */
var chai    = require('chai').assert;
var expect  = require('chai').expect;
var should = require('chai').should();
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

// avialble test model
var tmodels = [ 'Account', 'Adresse' ];

describe('Setting paths / states / load ->', function () {
  // change timeout connection
  it ('Should can connect on test database host on 127.0.0.0:27017', function (done) {
    db.connect('mongodb://localhost:27017/test').then(function() {
      expect(db.isConnected()).to.be.a('boolean').equal(true);
      expect(db.isDisconnected()).to.be.a('boolean').equal(false);
      done();
    });
  });
  
  // build paths
  _.each(paths, function (p) {
    it ([ 'Setting', p.key, 'paths sould be return true' ].join(' '), function () {
      var model = db[p.key](p.path);
      expect(model).to.be.a('boolean').equal(true);
      expect(db.paths[p.key.replace(p.key !== 'enums' ? 's' : '', '')]).to.be.not.empty;
      expect(db.paths[p.key.replace(p.key !== 'enums' ? 's' : '', '')]).to.be.a('string');
    });
  });

  it ('Database should be to an ready state', function () {
    expect(db.isReady()).to.be.a('boolean');
    expect(db.isReady()).equal(true);
  });

  it ('Model must be load property if database is ready', function (done) {
    db.load().then(function() {
      expect(db.isLoaded()).to.be.a('boolean');
      expect(db.isLoaded()).equal(true);
      done();
    })
  });

  it ('Load succeed model account must be available', function () {
    var instance = db.getModel('Account', true);
    expect(instance).to.be.a('object');
    expect(instance).to.be.not.empty;

    instance.should.have.property('_id');
    instance._id.toString().should.have.length(24);

    var fn = db.getModel('Account');
    expect(fn).to.be.a('function');
  });

  it ('Mongoose Types must be available on current model', function () {
    var fn = db.getModel('Account');
    expect(fn).to.be.a('function');
    expect(fn.Types).to.be.a('object');
    expect(fn.Types.Array).to.be.a('function');
    expect(fn.Types.Buffer).to.be.a('function');
    expect(fn.Types.Buffer.Binary).to.be.a('function');
    expect(fn.Types.Embedded).to.be.a('function');
    expect(fn.Types.Document).to.be.a('function');
    expect(fn.Types.DocumentArray).to.be.a('function');
    expect(fn.Types.ObjectId).to.be.a('function');
    expect(fn.Types.Subdocument).to.be.a('function');
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
