/**
 * Unit tests
 */
var expect  = require('chai').expect;
var _       = require('lodash');
var logger  = require('yocto-logger');
var db      = require('../src')(logger);
var path    = require('path');
var fs      = require('fs');

// disable console
logger.disableConsole();

/**
 * Definition rules test
 */
var definitions = JSON.parse(fs.readFileSync(path.resolve([
  __dirname, 'definitions-rules.json'
].join('/'))));

_.each(definitions, function(definition) {
  describe('Setting paths / states / load', function () {
    // change timeout connection
    it ('Should can connect on test database host on 127.0.0.0:27017', function (done) {
      db.connect('mongodb://localhost:27017/test').then(function() {
        expect(db.isConnected()).to.be.a('boolean').equal(true);
        expect(db.isDisconnected()).to.be.a('boolean').equal(false);
        done();
      });
    });
    
    // build paths
    _.each(definition.paths, function (p) {
      it ([ 'Setting', p, 'paths sould be return true' ].join(' '), function () {
        var model = db[p](path.resolve([ __dirname, definition.path, p ].join('/')));
        expect(model).to.be.a('boolean').equal(true);
        expect(db.paths[p.replace(p !== 'enums' ? 's' : '', '')]).to.be.not.empty;
        expect(db.paths[p.replace(p !== 'enums' ? 's' : '', '')]).to.be.a('string');
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

    it ('Create new instance, and access to Types must be succeed on defined models', function () {  
      // lauch test for each defined model
      _.each(db.mongoose.models, function(model) {
          var instance = db.getModel(model.modelName, true);
          var fn = db.getModel(model.modelName);
          expect(instance).to.be.a('object');
          expect(instance).to.be.not.empty;
          instance.should.have.property('_id');
          instance._id.toString().should.have.length(24);
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
});

