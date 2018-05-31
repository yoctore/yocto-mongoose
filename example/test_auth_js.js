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
  db.enableElasticsearch([ { host : '127.0.0.1', port : 9200, protocol : 'http' } ],
    elasticUseTls ? {
      ssl: {
        ca: fs.readFileSync(__dirname + "/cert.pem"),
        rejectUnauthorized: true
      }
    } : {});

  if (db.isReady(true)) {
    db.load().then(function() {


      var model = db.getModel('Auth');
      console.log(' \n\n Insert ... ')
      model.create( {
        login: {
          phone: "0691665500",
          email: 'alinquant@gmail.com' },
        email_string : 'aaaa'
      }).then(function (value) {

        console.log('\n --< create end ... ', value);

      }).catch(function (error) {
        console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));

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
