var logger    = require('yocto-logger');
var db        = require('../src/index.js')(logger);
var fs = require('fs');
var utils = require('yocto-utils');
var moment = require('moment');
var uri = 'mongodb://127.0.0.1:27017/r2do-crypto';
var _ = require('lodash');
var async = require('async');

// Read the certificate authority
var ca = [fs.readFileSync(__dirname + "/cert.crt")];
var cert = fs.readFileSync(__dirname + "/cert.pem");
var key = fs.readFileSync(__dirname + "/cert.key");

var mongoUseTls   = false;
var elasticUseTls = false;

var data = {
  insert : {
    docComplet : {
      "phone" : [
        "0",
        "06",
        "066",
        "0666",
        "066666",
        "06666666",
        "06666666666",
        "0666666666666",
        "066666666666666",
        "0666666666666666",
        "0666666666"
    ],
    "email" : [
      'aaaa@aaa.fr',
     'bbbb@bbb.fr',
     'cccc@ccc.fr',
     's',
     'sa',
     'sad',
     'sadm',
     'sadmi',
     'sadmin',
     'sadmin@',
     'sadmin@a',
     'sadmin@aa',
     'sadmin@aaa',
     'sadmin@aaaa',
     'sadmin@aaaaaa',
     'sadmin@aaaaaaa',
     'sadmin@aaaaaaaa',
     'sadmin@aaaaaaaaa',
     'sadmin@aaaaaaaaaa',
     'sadmin@aaaaaaaaaaa',
     'sadmin@aaaaaaaaaaaa',
     'sadmin@aaaaaaaaaaaaa',
     'sadmin@aaaaaaaaaaaaaaaa'
    ],
    firstname : [
      'j',
      'jo',
      'joh',
      'john'
    ],
    "origin_collection" : "account",
    "origin_id" : "5637510d30017af260dd08f3",
    "deleted_date" : null,
    "action_date" : null,
    "reference" : null,
    }
  },
  update : {
  }
};

// Connect
db.connect(uri, mongoUseTls ? {
  user : "r2do",
  pass : "bs8R0P<LN6Zj2j5j]soC<HL]v$b]XYAx",
  authMechanism : "SCRAM-SHA-1",
  server: {
    ssl:true, // enable ssl
    sslValidate:true, // validate ssl connection
    sslCA:ca, // ca
    sslKey:key, // key
    sslCert:cert, // certificate pem
    checkServerIdentity:false // if is self signed we must no enable server identifiy
  }
} : {
  ///user : "r2do",
  //pass : "bs8R0P<LN6Zj2j5j]soC<HL]v$b]XYAx",
  //authMechanism : "SCRAM-SHA-1"
}).then(function() {
  // load models
  db.models('./example/models');
  db.validators('./example/controllers');
  db.methods('./example/methods');
  db.enums('./example/enums');
  // enable elastic hosts
  db.enableElasticsearch([ { host : '192.168.2.110', port : 9200, protocol : 'http' } ],
    elasticUseTls ? {
      ssl: {
        ca: fs.readFileSync(__dirname + "/cert.pem"),
        rejectUnauthorized: true
      }
    } : {});

  if (db.isReady(true)) {
    db.load().then(function() {

      // Update first Doc
      var flushCollection = function (done) {
        var model = db.getModel('ES_Crypt_Pivot');

        console.log('\n\n --> flushCollection ()');
        model.remove({}).then(function (value) {
          console.log(' --> Doc deleted : \n', utils.obj.inspect(value));
          done();
        }).catch(function (error) {
          console.log(' --> Error deleted : ', utils.obj.inspect(error));
          done();
        });
      };

      // Update first Doc
      var createDocs = function (done) {
        var model = db.getModel('ES_Crypt_Pivot');

        var items = [];
        for (var i = 0; i < 3; i++) {
          items.push(i);
        }

        console.log('\n\n --> create docs');
        // Insert
        async.each(items, function (i, nextItem) {
          // Insert
          model.insert(_.merge(_.clone(data.insert.docComplet), {
            created_date : new Date(),
            updated_date : new Date(),
            reference : i
          })).then(function (value) {
            console.log(' --> Doc created : \n', utils.obj.inspect(value));
            nextItem();
          }).catch(function (error) {
            console.log(' --> Error created : ', utils.obj.inspect(error));
            nextItem();
          });
        }, function () {
          done();
        });
      };

      var getDocQuery1 = function (done) {
        var model = db.getModel('ES_Crypt_Pivot');


        var query = {
          bool : {
            must : [
              {
                term : {
                  origin_collection : 'account'
                }
              },
              {
                term : {
                  firstname: 'joh'
                }
              }
            ]
          }
        };

        // Options of query
      var queryOptions = {
        from : 0,
        size : 2
      };

        // Make an research on elasticsearch database
        model.esearch(query, queryOptions).then(function (value) {
          console.log(' --> res : ', utils.obj.inspect(value.hits));


        }).catch(function (error) {
          console.log(' --> Error getDocQuery1 : ', utils.obj.inspect(error));
        });
      };

      // Process
      async.series([
        // flushCollection,
        // createDocs,
        getDocQuery1
        // aggregate1
      ], function () {

        console.log('\n --> end test;');
      });

    }, function() {
      console.log('load error');
    });
  }
}).catch(function(error) {
  console.log(error);
  if (db.isConnected()) {
    db.disconnect().then(function() {

    }, function(error) {
      console.log('diconnect failed');
      console.log(error);
    });
  }
});
