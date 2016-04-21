var logger    = require('yocto-logger');
//logger.less();
//logger.less();
var db        = require('../src/index.js')(logger);

var m1 = function() {
  console.log('m1');
  console.log(this.get);
};

var m2 = function() {
  console.log('m2');
};

// Connect
db.connect('mongodb://localhost:27017/test').then(function() {
  // load models
  db.models('./example/models');
  db.validators('./example/controllers');
  db.methods('./example/methods');
  db.enums('./example/enums');
  db.elasticHosts([ { host : '127.0.0.1', port : 9200 }, { host : '127.0.0.1', port : 9500 } ]);
  if (db.isReady(true)) {
    db.load().then(function() {
      console.log('load success');
      var account = db.getModel('Account');
      console.log('===== value ===== ');
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