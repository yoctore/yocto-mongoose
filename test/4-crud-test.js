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
var fs      = require('fs');

// disable console
logger.disableConsole();

// needed data
var datas = JSON.parse(fs.readFileSync(path.resolve([ __dirname, 'model-definition.json' ].join('/'))));

var paths = [
  { key : 'models', path : './example/models' },
  { key : 'methods', path : './example/methods' },
  { key : 'enums', path : './example/enums' },
  { key : 'validators', path : './example/controllers' }
];

describe('Crud process ->', function () {
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

  _.each(datas, function (d) {
    it ([ 'Insert should be succeed for model', d.model, 'with method insert',
          'with data', utils.obj.inspect(d.insert) ].join(' '), function (done) {
        var model = db.getModel(d.model);

        expect(model).to.be.a('function');
        // insert data
        model.insert(d.insert).then(function (value) {

          var index = _.indexOf(datas, d);
          // add key here to process update or delete on next process
          datas[index].id = value._id.toString();


          var obj     = value.toObject();
          var dsize   = _.size(d.insert);
          var osize   = _.size(obj);

          expect(value).to.be.a('object');
          expect(osize).equal(dsize + 2); // mongo add _id et __v
          obj.should.have.property('_id');
          obj.should.have.property('__v');
          value._id.toString().should.have.length(24);
          done();
        }.bind(this));
    }.bind(d));
  });

  _.each(datas, function (d) {
    it ([ 'Find should be succeed for model', d.model, 'with method read',
          'with data ', utils.obj.inspect(d.insert) ].join(' '), function (done) {
        var model = db.getModel(d.model);

        expect(model).to.be.a('function');
        // insert data
        model.read(d.id).then(function (value) {
          var obj     = value.toObject();
          var dsize   = _.size(d.update);
          var osize   = _.size(obj);

          expect(value).to.be.a('object');
          expect(osize).equal(dsize + 2); // mongo add _id et _v
          obj.should.have.property('_id');
          value._id.toString().should.have.length(24);
          done();
        }.bind(this));
    }.bind(d));
  });

  _.each(datas, function (d) {
    it ([ 'Update should be succeed for model', d.model, 'with method modify',
          'with data ', utils.obj.inspect(d.update) ].join(' '), function (done) {
        var model = db.getModel(d.model);

        expect(model).to.be.a('function');
        // insert data
        model.modify(d.id, d.update).then(function (value) {
          var obj     = value.toObject();
          var dsize   = _.size(d.update);
          var osize   = _.size(obj);

          expect(value).to.be.a('object');
          expect(osize).equal(dsize + 2); // mongo add _id et _v
          obj.should.have.property('_id');
          value._id.toString().should.have.length(24);
          done();
        }.bind(this));
    }.bind(d));
  });

  _.each(datas, function (d) {
    it ([ 'Delete should be succeed for model', d.model, 'with method destroy' ].join(' '), function (done) {
        var model = db.getModel(d.model);
        expect(model).to.be.a('function');
        // insert data
        model.destroy(d.id).then(function (value) {
          var obj     = value.toObject();
          var dsize   = _.size(d.update);
          var osize   = _.size(obj);

          expect(value).to.be.a('object');
          expect(osize).equal(dsize + 2); // mongo add _id et _v
          obj.should.have.property('_id');
          value._id.toString().should.have.length(24);
          done();
        }.bind(this));
    }.bind(d));
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
