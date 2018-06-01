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

var validateDate = new Date(moment('2018-06-01T04:00:00.000').valueOf());
var validateDateUpdate = new Date(moment('2018-06-02T04:00:00.000').valueOf());

var version = 5;
console.log(' \n --> validateDate ', validateDate)

var data = {
  insert : {
    docComplet : {
      validated_date_crypt : validateDate,
      emails_arr_string : [
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
      emails_arr_object : [
        {
          validated_date : validateDate,
          validated_date_crypt : validateDate,
          address : 'ddddd@ddd.fr'
        },
        {
          validated_date : validateDate,
          validated_date_crypt : validateDate,
          address : 'eeee@eeee.fr'
        }
      ],
      email_string : 'fffff@ffff.fr',
      email_object : {
        validated_date : validateDate,
        validated_date_crypt : validateDate,
        address : 'gggggg@ggggg.fr'
      },
      reference_string : 'aaaaa',
      login_object : {
        phone_string : '0692111111',
        phones_arr_object : [
          {
            number_string : '0692111122',
          }
        ],
        phones_arr_string : [
          '0692111133',
          '0692111144',
          '0692111155'
        ]
      },
      receipt : {
        autorization : {
          request : null,
          response : null
        }
      }
    }
  },
  update : {
    updateWholeDoc : {
      validated_date_crypt : validateDateUpdate,
      emails_arr_string : [
        'aaaa-UpdatefirstDoc@aaa.fr',
        'bbbb-UpdatefirstDoc@bbb.fr',
        'cccc-UpdatefirstDoc@ccc.fr'
      ],
      emails_arr_object : [
        {
          validated_date : validateDateUpdate,
          validated_date_crypt : validateDateUpdate,
          address : 'ddddd-UpdatefirstDoc@ddd.fr'
        },
        {
          validated_date : validateDateUpdate,
          validated_date_crypt : validateDateUpdate,
          address : 'eeee-UpdatefirstDoc@eeee.fr'
        }
      ],
      email_string : 'fffff-UpdatefirstDoc@ffff.fr',
      email_object : {
        validated_date : validateDateUpdate,
        validated_date_crypt : validateDateUpdate,
        address : 'gggggg-UpdatefirstDoc@ggggg.fr'
      },
      reference_string : 'aaaaa-UpdatefirstDoc',
      login_object : {
        phone_string : '0692111111-UpdatefirstDoc',
        phones_arr_object : [
          {
            number_string : '0692111122-UpdatefirstDoc',
          }
        ],
        phones_arr_string : [
          '0692111133-UpdatefirstDoc',
          '0692111144-UpdatefirstDoc',
          '0692111155-UpdatefirstDoc'
        ]
      }
    }
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

  // enable redis
  db.enableRedis([ { "host" : "127.0.0.1", "port" : 6379 } ], false);

  if (db.isReady(true)) {
    db.load().then(function() {

      // Update first Doc
      var flushCollection = function (done) {
        var model = db.getModel('Test_crypto');

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
        var model = db.getModel('Test_crypto');

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
            id_count : i
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

      // Update first Doc
      var updateWholeDoc = function (done) {
        var model = db.getModel('Test_crypto');

        var updateData = data.update.updateWholeDoc;

        console.log('\n\n --> Update doc with following data : \n', utils.obj.inspect(updateData));

        model.update({
          id_count : 0
        }, updateData).then(function (value) {
          console.log(' --> Doc updateWholeDoc (id_count  = 0) : '+ value._id +
          ' \n', utils.obj.inspect(value));

          done();
        }).catch(function (error) {
          console.log(' --> Error updateWholeDoc : ', utils.obj.inspect(error));
          done();
        });
      };

      // Update
      var updateDocDotNotation1 = function (done) {

        var model = db.getModel('Test_crypto');
        var fn = 'updateDocDotNotation1';

        var updateData = {
          email_string : fn + '-1@aa.fr',
          $push : {
            emails_arr_string : {
              $each : [
                fn + '-2@aa.fr',
                fn + '-3@aa.fr'
              ]
            },
            emails_arr_object : {
              validated_date : validateDateUpdate,
              validated_date_crypt : validateDateUpdate,
              address : fn + '-4@aa.fr'
            }
          }
        };

        console.log('\n\n --> ' + fn +' () doc with following data : \n',
        utils.obj.inspect(updateData));

        model.update({
          id_count : 1,
          'emails_arr_object.address' : 'ddddd@ddd.fr'
        }, updateData).then(function (value) {

          console.log(' --> Doc ' + fn + ' () : '+ value._id +
          ' \n', utils.obj.inspect(value));

          done();
        }).catch(function (error) {
          console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
          done();
        });
      };

      // Update
      var updateDocDotNotation2 = function (done) {

        var model = db.getModel('Test_crypto');
        var fn = 'updateDocDotNotation2';

        var updateData = {
          email_string : fn + '-1@aa.fr',
          'emails_arr_object.$' : {
            validated_date : validateDateUpdate,
            validated_date_crypt : validateDateUpdate,
            address : fn + '-2@aa.fr'
          }
        };

        console.log('\n\n --> ' + fn +' () doc with following data : \n',
        utils.obj.inspect(updateData));

        model.update({
          id_count : 1,
          'emails_arr_object.address' : 'ddddd@ddd.fr'
        }, updateData).then(function (value) {

          console.log(' --> Doc ' + fn + ' () : '+ value._id +
          ' \n', utils.obj.inspect(value));

          done();
        }).catch(function (error) {
          console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
          done();
        });
      };

      // Update
      var updateDocNullValue1 = function (done) {

        var model = db.getModel('Test_crypto');
        var fn = 'updateDocNullValue1';

        var updateData = {
          receipt : {
            autorization : {
              request : {
                name_crypt : 'John Mc Kane',
                amount : 555,
                send_date : new Date()
              },
              response : null
            }
          }
        };

        console.log('\n\n --> ' + fn +' () doc with following data : \n',
        utils.obj.inspect(updateData));

        model.update({
          id_count : 2,
        }, updateData).then(function (value) {

          console.log(' --> Doc ' + fn + ' () : '+ value._id +
          ' \n', utils.obj.inspect(value));

          done();
        }).catch(function (error) {
          console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
          done();
        });
      };

      // Update
      var updateDocNullValue2 = function (done) {

        var model = db.getModel('Test_crypto');
        var fn = 'updateDocNullValue2';

        var updateData = {
          'receipt.autorization.response' : {
            data : {
              toto : [
                'tata',
                'titi'
              ],
              reference : {
                value : 'aaaaa'
              }
            },
            response_date : new Date()
          }
        };

        console.log('\n\n --> ' + fn +' () doc with following data : \n',
        utils.obj.inspect(updateData));

        model.update({
          id_count : 2,
        }, updateData).then(function (value) {

          console.log(' --> Doc ' + fn + ' () : '+ value._id +
          ' \n', utils.obj.inspect(value));

          done();
        }).catch(function (error) {
          console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
          done();
        });
      };

      // Update
      var getDocQuery1 = function (done) {

        var model = db.getModel('Test_crypto');
        var fn = 'getDocQuery1';

        var query = {
          $or : [
            {
              'login_object.phones_arr_string' : '0692111133'
            },
            {
              id_count : 55555
            }
          ]
          //'login_object.phones_arr_string' : '0692111133'
        };

        console.log('\n\n --> ' + fn +' () with following data : \n',
        utils.obj.inspect(query));

        model.get(query).then(function (values) {

          console.log(' --> Doc ' + fn + ' number elemFound (should be 3) : '+ _.size(values) +
          ' \n', utils.obj.inspect(values));

          done();
        }).catch(function (error) {
          console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
          done();
        });
      };

      // Update
      var getDocQuery2 = function (done) {

        var model = db.getModel('Test_crypto');
        var fn = 'getDocQuery2';

        var query = {
          "emails_arr_object" : {
            $elemMatch : {
              address : 'ddddd@ddd.fr',
              validated_date_crypt : validateDate
            }
          }
        };

        console.log('\n\n --> ' + fn +' () with following data : \n',
        utils.obj.inspect(query));

        model.get(query, 'emails_arr_object.$').then(function (values) {

          console.log(' --> Doc ' + fn + ' number elemFound (should be 3) : '+ _.size(values) +
          ' \n', utils.obj.inspect(values));

          done();
        }).catch(function (error) {
          console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
          done();
        });
      };

      var getDocQuery3 = function (done) {

        var model = db.getModel('Test_crypto');
        var fn = 'getDocQuery3';

        var query = {
          'emails_arr_object.address' : 'eeee@eeee.fr'
        };

        console.log('\n\n --> ' + fn +' () with following data : \n',
        utils.obj.inspect(query));

        model.get(query, 'emails_arr_object.$').then(function (values) {

          console.log(' --> Doc ' + fn + ' number elemFound (should be 3) : '+ _.size(values) +
          ' \n', utils.obj.inspect(values));

          done();
        }).catch(function (error) {
          console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
          done();
        });
      };

      // Update
      var aggregate1 = function (done) {

        var model = db.getModel('Test_crypto');
        var fn = 'aggregate1';

        var aggregate = [
          {
            $match : {
              $or : [
                {
                  'login_object.phones_arr_string' : '0692111133'
                },
                {
                  id_count : 55555
                }
              ]
            }
          },
          {
            $unwind : '$emails_arr_object'
          },
          {
            $project : {
              address : '$emails_arr_object.address'
            }
          },
          {
            $sort : {
              address : -1
            }
          }
        ];

        console.log('\n\n --> ' + fn +' () with following data : \n',
        utils.obj.inspect(aggregate));

        // Insert before another doc to not match
        model.insert(_.merge(_.clone(data.insert.docComplet), {
          created_date : new Date(),
          id_count : 9999,
          login_object : {
            phone_string : null,
            phones_arr_object : [],
            phones_arr_string : [
              '9999999'
            ]
          }
        })).then(function (value) {

          model.aggregate(aggregate).then(function (values) {

            console.log(' --> Doc ' + fn + ' number elemFound (should be 6) : '+ _.size(values) +
            ' \n', utils.obj.inspect(values));

            done();
          }).catch(function (error) {
            console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
            done();
          });
        }).catch(function (error) {
          console.log(' --> Error created : ', utils.obj.inspect(error));
          done();
        });
      };

      var cryptData = function (done) {

        var model = db.getModel('Test_crypto');
        var fn = 'cryptData';

        model.getOne({
          id_count : 0
        }).then(function (value) {

          console.log(' \n\--> Doc ' + fn + ' number elemFound (should be 3) : '+
          ' \n', utils.obj.inspect(value) + ' \n\n\n');

          console.log(' \n\n--> value.email_object = ', value.email_object, '\n\n')

          console.log(' \n\n --> value.email_object = ', value, '\n\n')

          value = value.toObject();
          model.update(value._id, value).then(function (value) {

            console.log(' --< update end ... ');

            done();

          }).catch(function (error) {
            console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
            done();
          });
        }).catch(function (error) {
          console.log(' --> Error ' + fn + ' : ', utils.obj.inspect(error));
          done();
        });
      };

      var flushAndInsertRedis = function (done) {

        var model = db.getModel('Test_crypto');
        var redisKey = 'test_insert_crypto';

        // Wait redis start
        setTimeout(function () {

          model.testFlushAndInsertRedis(redisKey).then(function (v) {

            console.log(' --> value set ', v);
            done();
          }).catch(function () {

            console.log(' --> value not found : ');
            done();
          });
        }, 200);
      };

      var getRedis = function (done) {

        var model = db.getModel('Test_crypto');
        var redisKey = 'test_insert_crypto';

        // Wait redis start
        setTimeout(function () {

          model.testGetRedis(redisKey).then(function (v) {

            console.log(' --> value : ', v);
            done();
          }).catch(function () {

            console.log(' --> value not found : ');
            done();
          });
        }, 200);
      };

      // Process
      async.series([
        flushCollection,
        createDocs,
        //cryptData,
        //updateWholeDoc,
        //updateDocDotNotation1,
        //updateDocDotNotation2,
        //updateDocNullValue1,
        // updateDocNullValue2,
        //getDocQuery1,
        //getDocQuery2,
        //getDocQuery3,
        flushAndInsertRedis,
       //getRedis
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
