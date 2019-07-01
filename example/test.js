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

var uri = 'mongodb://127.0.0.1:27017/dev-mongoose';

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

console.log(' \n ==> OK 1')


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


  // enable redis here
  db.enableRedis([ { host : '127.0.0.1', port : 6379 } ]);

  // Set timeout to wait Redis
  setTimeout(() => {
    
    if (db.isReady(true)) {
      console.log(' Enable redis ..')
      db.load().then(function() {
        for(var i = 0; i < 20; i ++) {
        db.getRedis().add('aezeazeaz_'+i+Math.random(), { took: 4,
    timed_out: false,
    _shards: { total: 5, successful: 5, failed: 0 },
    hits: { total: 0, max_score: null, hits: [] } });
        }
  
        /*db.getRedis().get('A').then(function(success) {
          console.log('redis s =>', success);
        }).catch(function (error) {
          console.log('redis eeee =>', error);
        })*/
        db.getRedis().remove('aezeazeaz', 'rererer');
        db.getRedis().flush('*33*');
        console.log('load success');
        var account = db.getModel('Account');
        console.log('===== value ===== ');

          var account = db.getModel('Account', true);
          account = db.getModel('Account');

          account.esearch('').then(function(a) {
            console.log('search a =>', a);
          }).catch(function (b) {
            console.log('search elatic b => ', b);
          });

          account.insert({ name : "aee", test : 'fsdfds' }).then(function(a) {
          //console.log('A =>', a);
          account.modify(a._id.toString(), { name : 'rezrezre' }).then(function(u) {
            //console.log('U =>', u);
            account.test1(u._id.toString()).then(function(g) {
              console.log('G =>' , g);
              account.test2(u._id.toString()).then(function(d) {
                //console.log('T2 =>', d);
              }).catch(function(e) {
                console.log('T2 failed', e);
              });
              /*account.destroy(g._id.toString()).then(function(d) {
                console.log('D =>', d);
              }).catch(function(e) {
                console.log('delete failed', e);
              });*/


              account.get({}).then(function (accounts) {

                console.log(' accounts : ', accounts);
              }).catch(function(e) {
                console.log('get accounts', e);
              });
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
  }, 500);
 
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