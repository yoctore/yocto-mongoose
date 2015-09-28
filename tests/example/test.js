var logger    = require('yocto-logger');
var db        = require('../../src/index.js')(logger);

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
  db.models('./tests/example/models');
  db.validators('./tests/example/controllers');
  db.methods('./tests/example/methods');
  if (db.isReady(true)) {
    db.load().then(function() {
      console.log('load success');
      var account = db.getModel('Account');
      //console.log(account);
      account.test1().then(function(data) {
        console.log(data);
      }).catch(function(error) {
        console.log(error);
      });
       //account.myMethod();
       //account.validate();

      var account = db.getModel('Account', true);
      account.test2();
      //console.log(account);

        account = db.getModel('Account');
        account.create({ name : ""}).then(function(a) {
        console.log('A =>', a);
        account.update(a._id.toString(), { name : 'rezrezre' }).then(function(u) {
          console.log('U =>', u);
          account.get(u._id.toString()).then(function(g) {
            console.log('G =>' , g);
            account.delete(g._id.toString()).then(function(d) {
              console.log('D =>', d);
            }).catch(function(e) {
              console.log('delete failed', e);
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
}, function(error) {
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