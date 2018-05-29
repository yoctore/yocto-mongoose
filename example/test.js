var logger    = require('yocto-logger');
//logger.less();
//logger.less();
var db        = require('../src/index.js')(logger);
var fs = require('fs');
var utils = require('yocto-utils');

var m1 = function() {
  console.log('m1');
  console.log(this.get);
};

var m2 = function() {
  console.log('m2');
};

var uri = 'mongodb://127.0.0.1:27017/r2do-crypto';

// Read the certificate authority
var ca = [fs.readFileSync(__dirname + "/cert.crt")];
var cert = fs.readFileSync(__dirname + "/cert.pem");
var key = fs.readFileSync(__dirname + "/cert.key");

var mongoUseTls   = false;
var elasticUseTls = false;

var insertModelA = {
  firstname : "firstname-to-crypt-1",
  lastname : "lastname-to-crypt",
  maiden_name : "maidenname-to-crypt",
  civility    : "civilty-to-crypt",
  childrens : [
    {
      firstname : "children-firstname-to-crypt",
      lastname : "children-lastname-to-crypt",
      testarray : [
        {
          foo : "aaaaaa"
        }
      ]
    }
  ],
  login : {
    email : 'toto@yocto.re',
    phone : '0639112233'
  },

  emails : [
    {
      primary : true,
      address : "email-address-to-c-rypt",
      validation_type : "validation_type",
      validated_date : new Date()
    }
  ],
  phones : [
    {
      primary : true,
      prefix     : "+262",
      phone_type : "gsm",
      number : "phones-number-to-crypt",
      validation_type : "validation_type",
      validated_date : new Date()
    }
  ],
  birth_date : new Date(708984000000),
  updated_date: new Date(),
  created_date: new Date(),
  iso_code : 'RE',
  sync : false,
  status : 'pending',
  objtest : {
    objfooa : [
      {
        objbara : "aaaaa"
      }
    ]
  },
  objtesttwo : {
    objfoob : {
      objsubb : [
        { objbarb : "aaaaa" }
      ],
      objstr : "ly-obj-str",
      objsubbb : [
        {
          subccc : {
            subdddd : "ddddd"
          },
          subeee : "eeee"
        }
      ]
    }
  }
};


var insertModelB = {
  objtesttwo : {
    objfoob : {
      objsubb : [
        { objbarb : "aaaaa" },
        { objbarb : "bbbbb" },
        { objbarb : "ccccc" },
        { objbarb : "ddddd" }
      ],
      objstr : "ly-obj-str",
      objsubbb : [
        {
          subccc : {
            subdddd : "ddddd"
          },
          subeee : "eeee"
        }
      ]
    }
  }
}

var insertModel = insertModelA;

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
  // enable redis here
  //db.enableRedis([ { host : '127.0.0.1', port : 6379 } ]);
  if (db.isReady(true)) {
    db.load().then(function() {
      /*for(var i = 0; i < 20; i ++) {
      db.getRedis().add('aezeazeaz_'+i+Math.random(), { took: 4,
  timed_out: false,
  _shards: { total: 5, successful: 5, failed: 0 },
  hits: { total: 0, max_score: null, hits: [] } });
      }*/

      /*db.getRedis().get('A').then(function(success) {
        console.log('redis s =>', success);
      }).catch(function (error) {
        console.log('redis eeee =>', error);
      })*/
      //db.getRedis().remove('aezeazeaz', 'rererer');
      //db.getRedis().flush('*33*');

      function getOneToObject() {
        var model = db.getModel('Account');;
        // try to get
        model.get('5af96f9f063ca40ccc5085e0').then(function (value) {
          console.log('\n # Success result :',value);
          console.log('\n # Success result toObject() :', value.toObject() );
        }).catch(function (error) {
          console.log(error);
        });
      }

      function testGet() {
        var id = "5b0be668dc0775961ab69764";
        var accountModel = db.getModel('Account');
        console.log('al');
        var authModel = db.getModel('Auth');

        console.log(' --> id : ', id)

        accountModel.get(id).then(function (account) {

          console.log(' -> acc ', account);

          var accountTmp = account;
          console.log("auth =>", accountTmp.auths);
          authModel.get({
            _id : {
              $in : accountTmp.auths
            }
          }, '-reseted_passwords._id').then(function (auths) {

            console.log(' --> auths : ', auths)

          }).catch(function (error) {

            console.log(' --> error Auth : ', error);
          });
        }).catch(function (error) {

          console.log(' --> error : ', error);
        });
      }

      function testAccountAndGet(id, getDetail) {
        // Create a promise deferred
       // var deferred  = Q.defer();

        var accountModel = db.getModel('Account');
        var authModel = db.getModel('Auth');

        console.log(' --> id : ', id)

        accountModel.get({ _id : id }, 'auths').then(function (account) {

          console.log(' -> acc ')

          console.log(utils.obj.inspect(account));
          console.log(account);
          console.log('===== to object ========');
          var accountTmp = account.toObject();

          authModel.get({
            _id : {
              $in : accountTmp.auths
            }
          }, '-reseted_passwords._id').then(function (auths) {

            console.log(' --> auths : ', auths)

          }).catch(function (error) {

            console.log(' --> error Auth : ', error);
          });

        }).catch(function (error) {

          console.log(' --> error : ', error);
        });
      }

      function testInsert() {
        var account = db.getModel('Account');
        console.log('=> STARTING TEST ');
      //account.test1();
      //console.log(account.enums().get('notify_type_list'));

        //account = db.getModel('Account', true);

        /*account = db.getModel('Account');
        account.esearch('', true).then(function(a) {
          console.log('search a =>', a);
        }).catch(function (b) {
          console.log('search elatic b => ', b);
        });
        */
        console.log('=> STARTING INSERT');
        account.create(insertModel).then(function(a) {
          console.log('===> INSERT RETURN VALUE :', utils.obj.inspect(a.toObject()));
          console.log('=> ENDING INSERT');
       // a = a.toObject()
        }).catch(function(e) {
          console.log('crate failed', e);
        });
      }

      function testInsertAuth() {
        var authModel = db.getModel('Auth');

        console.log('=> STARTING INSERT AUTH');
        authModel.insert({
          auth_type : 'standard',
          login : {
            email : 'toto@yopmail.com',
            phone : '012345',
            old_phone : {
              number : '12344'
            }
          },
          loginarr : [
            {
              emailarr : 'toto-arr1@yopmail.com'
            }
          ],
          password : 'hashhhhhhhh',
          created_date : new Date(),
          updated_date : new Date(),
          last_connection_date : new Date()
        }).then(function(a) {
          console.log('===> INSERT AUTH  RETURN VALUE :', utils.obj.inspect(a.toObject()));
          console.log('=> ENDING INSERT');
       // a = a.toObject()
        }).catch(function(e) {
          console.log('crate failed', e);
        });
      }

      function testGetAuth(email) {

        var authModel = db.getModel('Auth');

        var query = {
          //  'login.email' : email
           //"login.old_phone.number" : "28ec07c89bdca2ce236508a84c1bc752"

          "login.old_phone.number" : "12344",

          //login : {
          //  old_phone : {
          //    number : '12344'
          //  }
          //},
          //"auth_type" : "standard",
          //"loginarr.emailarr" : "toto-arr1@yopmail.com"
        };

        console.log(' -->  Search Auth for query : ', query)

        authModel.get('5b0be668dc0775961ab69763').then(function (value) {

          console.log(' --> auth : ', utils.obj.inspect(value));
        }).catch(function (error) {

          console.log(' --> testGetAuth() error : ', error);
        });
      }

      function updateAuth() {

        var authModel = db.getModel('Auth');

        try {
          authModel.update({
            _id : '5b0be668dc0775961ab69763'
          }, {
            login : {
              "email" : "bbb@aaa.fr",
              "phone" : "97456",
              /*"old_phone" : {
                  "number" : "123456"
              }*/
            },
            auth_type : "aaaaa",
            loginarr : [ {
              emailarr: 'toto-arr1@yopmail.com' } ],
/*            "foo.bar" : 1,
            "bar.nuull" : null,
            a : {
              b : null
            },
            $or: [
             { 'login.email': '0692556690' },
             { 'login.phone': '0692556690' }
           ],
           */
/*
           'loginaa.$.email' : { $in : ['aa@aa.aa', 'bbbb '] },

           loginarr : {
             $elemMatch : {
               emailarr : 'toto',
               foo : 'bar'
             }
           },

          $or    : [
            {
              'login.email' : {
                $eq : 'tata@tata.fr'
              }
            }
          ]
          */
          }).then(function (value) {
            console.log(' --> updateAuth() : ', utils.obj.inspect(value));
          }).catch(function (error) {

            console.log(' --> updateAuth() error : ', error);
          });
        } catch (error) {
          console.log(error)
        }
      }

      //testGet();
      //testAccountAndGet('5aba2eafbe26f1561303e80a');

      // testInsert();

      function testNoChangeSchema() {
        var obj = { updated_date: 1526628511901,
          'fsdfsd.$.to' : 1,
          '$or' : {},
          'final.updated_date': '2018-05-18T07:28:31.901Z',
          'final.response': 
           { status: 0,
             data: 
              { idtkt: '999201805180010043801033',
                items: 
                 [ { ean: '6194049100013',
                     mnttva: 0.02,
                     netttc: 0.87,
                     qte: 1,
                     puvttc: 0.87,
                     mntavg: 0,
                     netht: 0.85,
                     txtva: 2.1 },
                   { ean: '2000000002057',
                     mnttva: 0.39,
                     netttc: 5,
                     qte: 1,
                     puvttc: 5,
                     mntavg: 0,
                     netht: 4.61,
                     txtva: 8.5 },
                   { ean: '3021690017403',
                     mnttva: 0.06,
                     netttc: 3.07,
                     qte: 1,
                     puvttc: 3.07,
                     mntavg: 0,
                     netht: 3.01,
                     txtva: 2.1 },
                   { ean: '3456300002133',
                     mnttva: 0.11,
                     netttc: 5.3,
                     qte: 1,
                     puvttc: 5.3,
                     mntavg: 0,
                     netht: 5.19,
                     txtva: 2.1 } ],
                itemscond: 
                 [ { mntcond: 100, qte: 1, cond: 'maxnetttc', ean: '2000000002057' } ],
                idtrs: '5afd3a7e7390e4136b76daec',
                idm: 1033,
                mntavg: 0,
                netht: 13.66,
                dt: '2018-05-17T20:00:00.000Z',
                tva: 
                 [ { totalTTC: 5, taux: 8.5, totalHT: 4.61, montant: 0.39 },
                   { totalTTC: 9.24, taux: 2.1, totalHT: 9.05, montant: 0.19 } ],
                netttc: 14.24 } } };
        var model = db.getModel('Account');
        model.update(obj).then(function (value) {
          console.log(' --> updateAuth() : ', utils.obj.inspect(value));
        }).catch(function (error) {
          console.log(' --> updateAuth() error : ', error);
        });
      }

      function testUpdateFailed() {
        var obj = { updated_date: 1527518027940,
          final: 
           { created_date: '2018-05-28T14:33:47.940Z',
             updated_date: '2018-05-28T14:33:47.940Z',
             request: 
              { itemscond: [ { mntcond: 100, qte: 1, cond: 'maxnetttc', ean: '2000000002057' } ],
                items: [ { ean: '3273220080207', qte: 2 } ],
                idm: 1029,
                idtrs: '5b07e8f5bc24072d7b812051' },
             response: null } };
             var model = db.getModel('Account');
             model.update(obj).then(function (value) {
               console.log(' --> updateAuth() : ', utils.obj.inspect(value));
             }).catch(function (error) {
               console.log(' --> updateAuth() error : ', error);
             });        
      }

      function testUpdateAgainFailed() {
        var obj = { data: 
          { reply_to: null,
            expeditor: 
             { name: 'Service Clients Jumbo Drive',
               email: 'service-clients@jumbodrive.re',
               sub_account: 'jumbo-drive' },
            recipients: [ { iso_code: null, prefix: '', recipient: 'toto974@yopmail.com' } ],
            subject: 'Inscription sur le site Jumbo-drive',
            message: 'balard, <br>Merci de votre inscription.<br>Veuillez valider votre compte en cliquant sur le lien suivant :<br><a href="http://jumbodrive.local/validation/email/ec157991b1b8b82c9f636f3c1fc27e51057d31a49d7f5a50c313cf108a3a08cff1ad9c8f4754cb23d574c2c70837af7f17755dacadbaf62a468789e3c7447cd58698d87487e6daacb292d441cd8eb01f183dfe176bd2dcc56cf52f6e64c81b013b35acaae889a94b0568519b366112d108767b25ea3699637f12db23190e23fe8e3344180dddf63f58a9d05e0483458e6513a47b1832bdb4e5db184bfeb6a333253b731677b1632e015ee351c2931d44">Cliquer ici pour valider votre compte</a><br><br>A bientôt,<br>L\'équipe Jumbo-drive.' },
         updated_date: 1527579153951 };

         var model = db.getModel('Notify');
         model.update(obj).then(function (value) {
           console.log(' --> testUpdateAgainFailed() : ', utils.obj.inspect(value));
         }).catch(function (error) {
           console.log(' --> testUpdateAgainFailed() error : ', error);
         });    
      }

      function testStringArray() {
        var obj = {
          "email" : [ 
            "a", 
            "aa", 
            "aaa", 
            "aaa@", 
            "aaa@a", 
            "aaa@aa", 
            "aaa@aaa", 
            "aaa@aaa.", 
            "aaa@aaa.c", 
            "aaa@aaa.co", 
            "aaa@aaa.com"
          ]
        };

        var model = db.getModel('Account');
        model.update(obj).then(function (value) {
          console.log(' --> testStringArray() : ', utils.obj.inspect(value));
        }).catch(function (error) {
          console.log(' --> testStringArray() error : ', error);
        });    
      }

      //testStringArray();
      //testUpdateAgainFailed();
      //testUpdateFailed();
      //testNoChangeSchema();
      testInsertAuth();
      //testGetAuth();
      //getOneToObject();
      //updateAuth();
      //testInsert();
        //delete a._id;
        //a.updated_date = new Date();
        //console.log('=> STARTING UPDATE');
        //account.modify('5ab3cc6151366dee635c5afe', a).then(function(u) {
          //console.log('===> UPDATE RETURN VALUE :', utils.obj.inspect(a));
          //console.log('=> ENDING UPDATE');
          //console.log('U =>', u);
          /*account.test1(u._id.toString()).then(function(g) {
            console.log('G =>' , g);
            account.test2(u._id.toString()).then(function(d) {
              console.log('T2 =>', d);
            }).catch(function(e) {
              console.log('T2 failed', e);
            });
            /*account.destroy(g._id.toString()).then(function(d) {
              console.log('D =>', d);
            }).catch(function(e) {
              console.log('delete failed', e);
            });
          }).catch(function(e) {
            console.log('get failed', e);
          });
        //}).catch(function(e) {
          //console.log('update failed', e);
        //})
      }).catch(function(e) {
        console.log('crate failed', e);
      });
*/
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
