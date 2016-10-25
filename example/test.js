var logger    = require('yocto-logger');
//logger.less();
//logger.less();
var db        = require('../src/index.js')(logger);
var fs = require('fs');

var m1 = function() {
  console.log('m1');
  console.log(this.get);
};

var m2 = function() {
  console.log('m2');
};

var uri = 'mongodb://10.166.12.140:27017/r2do';

// Read the certificate authority
var ca = [fs.readFileSync(__dirname + "/cert.crt")];
var cert = fs.readFileSync(__dirname + "/cert.pem");
var key = fs.readFileSync(__dirname + "/cert.key");

var mongoUseTls   = true;
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
  user : "r2do",
  pass : "bs8R0P<LN6Zj2j5j]soC<HL]v$b]XYAx",
  authMechanism : "SCRAM-SHA-1"
}).then(function() {
  // load models
  db.models('./example/models');
  db.validators('./example/controllers');
  db.methods('./example/methods');
  db.enums('./example/enums');
  // enable elastic hosts
  db.elasticHosts([ { host : '37.187.183.24', port : 10300, protocol : 'http' }, { host : '37.187.183.24', port : 10200, protocol : 'http' } ],
    elasticUseTls ? {
      ssl: {
        ca: fs.readFileSync(__dirname + "/cert.pem"),
        rejectUnauthorized: true
      }
    } : {});
  // enable redis here
  db.enableRedis([ { host : '10.166.13.10', port : 10600 } ]);
  if (db.isReady(true)) {
    db.load().then(function() {
      db.getRedis().add('aezeazeaz', { took: 4,
  timed_out: false,
  _shards: { total: 5, successful: 5, failed: 0 },
  hits: { total: 0, max_score: null, hits: [] } });
      /*db.getRedis().get('A').then(function(success) {
        console.log('redis s =>', success);
      }).catch(function (error) {
        console.log('redis eeee =>', error);
      })*/
      console.log('load success');
      var account = db.getModel('Account');
      console.log('===== value ===== ');
      account.test1();
      console.log(account.enums().get('notify_type_list'));

      var account = db.getModel('Account', true);


        account = db.getModel('Account');
        account.esearch('', true).then(function(a) {
          console.log('search a =>', a);
        }).catch(function (b) {
          console.log('search elatic b => ', b);
        });
        
        account.insert({ name : "aee", test : 'fsdfds' }).then(function(a) {
        console.log('A =>', a);
        account.modify(a._id.toString(), { name : 'rezrezre' }).then(function(u) {
          console.log('U =>', u);
          account.read(u._id.toString()).then(function(g) {
            console.log('G =>' , g);
            /*account.destroy(g._id.toString()).then(function(d) {
              console.log('D =>', d);
            }).catch(function(e) {
              console.log('delete failed', e);
            });*/
          }).catch(function(e) {
            console.log('get failed', e);
          });
        }).catch(function(e) {
          console.log('update failed', e);
        })
      }).catch(function(e) {
        console.log('crate failed', e);
      });

    }, function() {
      console.log('load error');
    });
  }
}).catch(function(error) {
  if (db.isConnected()) {
    db.disconnect().then(function() {
  
    }, function(error) {
      console.log('diconnect failed');
      console.log(error);
    });
  }
});


/**
          // TEST TO REMOVE
        created.get(1).then(function(a) {
          console.log('aaaaa');
          console.log(a);
          return created.getOne();
        }).then(function (e) {
          console.log('eeeee');
          console.log(e);
        }).catch(function(err) {
          console.log(err)
        }).done();
        
        
        
   // console.log(model);
    model.create({ name : "a"}).then(function(a) {
      console.log('a');
    }).catch(function(e) {
      console.log(e);
    });

        */