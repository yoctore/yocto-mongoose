/**
 * Unit tests
 */
var chai    = require('chai').assert;
var expect  = require('chai').expect;
var should = require('chai').should();
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
  describe('Crud process ->', function () {
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
    _.each(datas, function (d, index) {
      // get correct query
      var insertQuery = d.crypto ? d.insert.nocrypt : d.insert; 
      var updateQuery = d.crypto ? d.update.nocrypt : d.update;

      // Insert test
      it ([ '[ CRYPTO -', d.crypto ? 'ENABLE' : 'DISABLE', ']',
        'Insert should be succeed for model',
        d.model, 'with method insert with data' ].join(' '), function (done) {
          var model = db.getModel(d.model);
          expect(model).to.be.a('function');

          // insert data
          model.insert(insertQuery).then(function (value) {
            // add key here to process update or delete on next process
            datas[index].currentId = value._id.toString();
            // check process
            var obj     = value.toObject();
            var dsize   = _.size(insertQuery);
            var osize   = _.size(obj);
            //console.log("size =>", dsize, osize, obj);
            expect(value).to.be.a('object');
            expect(osize).equal(dsize + 2); // mongo add _id et __v
            obj.should.have.property('_id');
            obj.should.have.property('__v');
            value._id.toString().should.have.length(24);
            done();
          }.bind(this)).catch(function (error) {
            done(error);
          });
      });

      it ([ '[ CRYPTO -', d.crypto ? 'ENABLE' : 'DISABLE', ']',
      'Find should be succeed for model', d.model, 'with method read with data '
      ].join(' '), function (done) {
          var model = db.getModel(d.model);
          expect(model).to.be.a('function');
          // insert data
          model.get(d.currentId).then(function (value) {
            var obj     = value.toObject();
            var dsize   = _.size(insertQuery);
            var osize   = _.size(obj);
            expect(value).to.be.a('object');
            expect(osize).equal(dsize + 2); // mongo add _id et _v
            obj.should.have.property('_id');
            value._id.toString().should.have.length(24);
            done();
          }.bind(this)).catch(function (error) {
            done(error);
          });
      });
   
      it ([ '[ CRYPTO -', d.crypto ? 'ENABLE' : 'DISABLE', ']',
       'Update should be succeed for model', d.model, 'with method modify and with data'
      ].join(' '), function (done) {
          var model = db.getModel(d.model);
          expect(model).to.be.a('function');
          // insert data
          model.modify(d.currentId, updateQuery).then(function (value) {
            var obj     = value.toObject();
            var dsize   = _.size(insertQuery);
            var osize   = _.size(obj);
            expect(value).to.be.a('object');
            expect(osize).equal(dsize + 2); // mongo add _id et _v
            obj.should.have.property('_id');
            value._id.toString().should.have.length(24);
            done();
          }.bind(this)).catch(function (error) {
            done(error);
          });
      });

      it ([ '[ CRYPTO -', d.crypto ? 'ENABLE' : 'DISABLE', ']',
         'Find should be succeed for model', d.model,
         'after update and value must match with updated data' ].join(' '), function (done) {
          var model = db.getModel(d.model);
          expect(model).to.be.a('function');
          // insert data
          model.get(d.currentId).then(function (value) {
            var obj     = value.toObject();
            var dsize   = _.size(insertQuery);
            var osize   = _.size(obj);
            expect(value).to.be.a('object');
            expect(osize).equal(dsize + 2); // mongo add _id et _v
            obj.should.have.property('_id');
            value._id.toString().should.have.length(24);

            // test value
            _.each(Object.keys(updateQuery), function (key) {
              obj.should.have.property(key);
              if (!d.crypto) {
                expect(_.get(obj, key)).equal(_.get(updateQuery, key));                
              } else {
                var current =  JSON.parse(JSON.stringify(_.get(obj, key)));
                var data = JSON.parse(JSON.stringify(_.get(updateQuery, key)));
                // is array ? we need to do specific process to check value matching
                if (_.isArray(data)) {
                  current = _.map(current, function (c) {
                    if (_.has(c, '_id')) {
                      c = _.omit(c, [ '_id' ]);
                    }
                    return c;
                  })                  
                }                  
                expect(current).eql(data); 
              }
            });
            done();
          }.bind(this)).catch(function (error) {
            done(error);
          });
      });

      it ([ '[ CRYPTO -', d.crypto ? 'ENABLE' : 'DISABLE', ']',
            'Delete should be succeed for model', d.model,
            'with method destroy for id' ].join(' '), function (done) {
          var model = db.getModel(d.model);
          expect(model).to.be.a('function');
          // insert data
          model.destroy(d.currentId).then(function (value) {
            var obj     = value.toObject();
            var dsize   = _.size(insertQuery);
            var osize   = _.size(obj);
            expect(value).to.be.a('object');
            expect(osize).equal(dsize + 2); // mongo add _id et _v
            obj.should.have.property('_id');
            value._id.toString().should.have.length(24);
            done();
          }.bind(this)).catch(function (error) {
            done(error);
          });
      });

      it ([ '[ CRYPTO -', d.crypto ? 'ENABLE' : 'DISABLE', ']',
        'Find should be return an empty value for model', d.model,
        'after delele action' ].join(' '), function (done) {
          var model = db.getModel(d.model);
          expect(model).to.be.a('function');
          // insert data
          model.get(d.currentId).then(function (value) {
            expect(value).to.be.null;
            done();
          }.bind(this)).catch(function (error) {
            done(error);
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
});
