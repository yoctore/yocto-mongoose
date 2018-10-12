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

/**
 * Launch test on each definition rules
 */
_.each(definitions, function(definition) {
  // get datas on insert
  var datas = JSON.parse(fs.readFileSync(path.resolve([ 
    __dirname, definition.path, 'model-definition.json' ].join('/'))));
  // do crud process
  describe([ definition.label, 'Enums process ->' ].join(' '), function () {
    // change timeout connection
    this.timeout(5000);

    // Connection test
    it ('Should can connect on test database host on 127.0.0.0:27017', function (done) {
      db.connect('mongodb://localhost:27017/test').then(function() {
        expect(db.isConnected()).to.be.a('boolean');
        expect(db.isConnected()).equal(true);
        expect(db.isDisconnected()).to.be.a('boolean');
        expect(db.isDisconnected()).equal(false);
        done();
      });
    });

    // Path test
    _.each(definition.paths, function (p) {
      it ([ 'Setting', p, 'paths sould be return true' ].join(' '), function () {
        var model = db[p](path.resolve([ __dirname, definition.path, p ].join('/')));
        expect(model).to.be.a('boolean').equal(true);
        expect(db.paths[p.replace(p !== 'enums' ? 's' : '', '')]).to.be.not.empty;
        expect(db.paths[p.replace(p !== 'enums' ? 's' : '', '')]).to.be.a('string');
      });
    });
  
    // Ready state test
    it ('Database should be to an ready state', function () {
      expect(db.isReady()).to.be.a('boolean');
      expect(db.isReady()).equal(true);
    });

    // Load test and reset for previous load in other test
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

    // Main test block
    _.each(datas, function (d) {
      it ('Must return a valid enums list', function () {
        var model = db.getModel(d.model);
        expect(model).to.be.a('function');

        // parse all enums item
        _.each(d.enums, function (e) {
          // get available enums
          var enums = model.enums().get(e);
          expect(enums).to.be.a('array');
          expect(enums).to.be.not.empty;
        });
      });
    
      it ('Must acces to mongooseTypes from enums', function () {
        var model = db.getModel(d.model);
        expect(model).to.be.a('function');
        _.each(d.enums, function (e) {
          // get available enums
          var enums = model.enums().get(e);
          expect(enums).to.be.a('array');
          expect(enums).to.be.not.empty;
          expect(model.enums().Types).to.be.a('object');
          expect(model.enums().Types.Array).to.be.a('function');
          expect(model.enums().Types.Buffer).to.be.a('function');
          expect(model.enums().Types.Buffer.Binary).to.be.a('function');
          expect(model.enums().Types.Embedded).to.be.a('function');
          expect(model.enums().Types.Document).to.be.a('function');
          expect(model.enums().Types.DocumentArray).to.be.a('function');
          expect(model.enums().Types.ObjectId).to.be.a('function');
          expect(model.enums().Types.Subdocument).to.be.a('function');
        });
      });
    });

    // disconnect must succeed
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
