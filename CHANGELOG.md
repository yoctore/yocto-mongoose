## 0.9.0 (2015-09-28)

- Changing promise middleware from promiseJs to Q

## 0.8.0 (2015-09-28)

- Deleted addStatic method
- Deleted addMethod method
- Deleted addFn method
- Added createMethod method : auto add defined method on current schema from given method directory
- Added a new module "Method". That will automatically add a defined method on a current model model if config json "fn" property was filled.

## 0.7.0 (2015-09-28)

- Generate distribution file on dist directory
- Some fixes

## 0.6.0 (2015-09-28)

General changes : 

- Added addStatic method : add a static method to given schema
- Added addMethod method : add a instance method to given schema
- Added addFn method : default function to process add static or instance method on a schema
- Some code fixes
- Added createValidator method : auto add a validator function on create crud if validator name is given on config file

Module changes :

- Added a new validator module to manage auto generation of validate method on create request

## 0.5.0 (2015-09-27)

- Added getModel method to retrieve a valid model

## 0.4.0 (2015-09-27)

- Added addCrud method to enable crud flag from model
- Finished load method for autoloading of models from given path
- Added isLoaded method. This method get model load status 

## 0.3.0 (2015-09-27)

- Adding get et getOne statics method on crud Class
- Adding delete statics method on crud Class

## 0.2.0 (2015-09-27)

- Changed controllers Method name to validators

## 0.1.0 (2015-09-25)

Added all base function.
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
- Added createModel method : auto add a model on current schema
