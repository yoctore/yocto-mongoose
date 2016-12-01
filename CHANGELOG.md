## 2.2.0 (2016-12-01)

- Add Mongoose Types available on current model

## 2.1.1 (2016-12-01)

- Fix find usage on lodash for enums process
- Update package
- redis.get('YOUR_KEY') method reject the current promise if no key was found
- Update unit tests for delete/remove action on redis usage 
- Change load method to use async.each instead of lodash _.each

## 2.1.0 (2016-11-21)

- Change node engine version to use 4.6.x to use current LTS version until April migration to new lts version
- Add new flush method to provide flush data on current database. This method use pipeline & scan method.
- Update remove method to use pipeline. Now it's possible to send to delete method multiple value for deletion
- Add Mongoose.Schema.Types available on enums modules.
- Add custom pre hook on schema
- Update dependencies modules
- Update node requirement to use 4.6.x LTS Version

## 2.0.0 (2016-10-25)

- Major Update for lodash, joi, ioredis async
- *Remove elasticHosts method. Use enableElasticsearch method instead of elasticHosts.*
- Improve connection manager

## 1.7.2 (2016-06-02)

- Update joi validation to enable host string for Redis and elasticsearch


## 1.7.1 (2016-05-23)

- Bufferize config files when enable ssl authentication for mongodb

## 1.7.0 (2016-05-20)

- Add method remove(key) into redis implementation

## 1.6.0 (2016-05-10)

- Add redis support (add/set & get), on crud method and custom method.

## 1.5.0 (2016-05-10)

- Add SSL/TLS support for elasticsearch connection

## 1.4.6 (2016-04-27)

- Remove the params 'hydrate' when made an esearch() request, now all options will be pass as an options to mongoosastic

## 1.4.5 (2016-04-21)

- Fix [#issue 3](https://github.com/yoctore/yocto-mongoose/issues/3)
- Update Dependencies for mongoose and grunt

## 1.4.4 (2016-04-21)

- Fix [#issue 2](https://github.com/yoctore/yocto-mongoose/issues/2)

## 1.4.3 (2016-04-20)

- Add options on model => [#issue 1](https://github.com/yoctore/yocto-mongoose/issues/1)
- Add rules to authorize auth and protocol properties on default elasticsHosts method

## 1.3.0 (2015-01-16)

- Add middleware post configuration on schema config.
- Add filter on get(s) method
- Add multi update process from upate method

## 1.2.6 (2015-12-09)

- Bug fixe : use 'lodash.extend()' instead of 'lodash.merge()' in the create CRUD method to solve bug with array values

## 1.2.5 (2015-11-10)

- Set the library Q. to handle promise in mongoose

## 1.2.4 (2015-10-12)

- Change content of readme.md
- Change package content

## 1.2.2 & 1.2.3 (2015-10-09)

- Fix a bug on glob.sync on method add function. Now app retrieve correct method file associated with the current method
- Fix join string on glob.sync

## 1.2.1 (2015-09-02)

- Fix bug on alias function
- Add auto exclude of alias when main method is on exclude list

## 1.2.0 (2015-09-02)

- Add alias function for crud methods

## 1.1.0 (2015-09-02)

- Add a new method getValidateSchema when a validator was add.

## 1.0.6 (2015-09-02)

- Add dynamic call of custom function with apply and all given arguments

## 1.0.5 (2015-09-30)

- Fixed logging usage on Method.add

## 1.0.4 (2015-09-30)

- Change usage of merge data on create method to retrieve value

## 1.0.3 (2015-09-30)

- Change regex for method listing
- Add schema instance on given method by dependencies injection

## 1.0.2 (2015-09-30)

- Add instance of enums automaticly on validator function

## 1.0.1 (2015-09-30)

- Change display of king of message when is enums process

## 1.0.0 (2015-09-30)

Add enums process.
- Add Enums class to manage enum action. All schema a by default a static called 'enums' to retrieve enums data by 'get' method

## 0.9.5 (2015-09-29)

- Change logger usage to display debug message on debug mode and all necessary item to info

## 0.9.4 (2015-09-29)

- Fix tests cases for model defintion for crud object

## 0.9.3 (2015-09-29)

- Change logger usage from warning to error for invalid schema during addModel process

## 0.9.2 (2015-09-29)

- Add more test on object property for some cases.

## 0.9.1 (2015-09-29)

- Change path rules for file matching during model load

## 0.9.0 (2015-09-28)

- Change promise middleware from promiseJs to Q

## 0.8.0 (2015-09-28)

- Deleted addStatic method
- Deleted addMethod method
- Deleted addFn method
- Add createMethod method : auto add defined method on current schema from given method directory
- Add a new module "Method". That will automatically add a defined method on a current model model if config json "fn" property was filled.

## 0.7.0 (2015-09-28)

- Generate distribution file on dist directory
- Some fixes

## 0.6.0 (2015-09-28)

General changes :

- Add addStatic method : add a static method to given schema
- Add addMethod method : add a instance method to given schema
- Add addFn method : default function to process add static or instance method on a schema
- Some code fixes
- Add createValidator method : auto add a validator function on create crud if validator name is given on config file

Module changes :

- Add a new validator module to manage auto generation of validate method on create request

## 0.5.0 (2015-09-27)

- Add getModel method to retrieve a valid model

## 0.4.0 (2015-09-27)

- Add addCrud method to enable crud flag from model
- Finish load method for autoloading of models from given path
- Add isLoaded method. This method get model load status

## 0.3.0 (2015-09-27)

- Add get et getOne statics method on crud Class
- Add delete statics method on crud Class

## 0.2.0 (2015-09-27)

- Change controllers Method name to validators

## 0.1.0 (2015-09-25)

Add all base function.
- isConnected : get status of connection
- isDisconnected : get status of disconnection
- connect : connect to database
- disconnect : disconnect if connected on database
- setPath : Min function call during add path action
- isReady : Check if connection is ready
- models :  add model directory for load
- controllers : add controllers directory for mapping with model
- addModel : Add a model from given json file
- load : Load model definition given from json file
- Add createModel method : auto add a model on current schema
