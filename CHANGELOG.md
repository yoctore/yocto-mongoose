## 0.0.7 (2015-09-28)

- Generate distribution file on dist directory
- Some fixes

## 0.0.6 (2015-09-28)

General changes : 

- Adding addStatic method : add a static method to given schema
- Adding addMethod method : add a instance method to given schema
- Adding addFn method : default function to process add static or instance method on a schema
- Some code fixes
- Adding createValidator method : auto add a validator function on create crud if validator name is given on config file

Module changes :

- Adding a new validator module to manage auto generation of validate method on create request

## 0.0.5 (2015-09-27)

- Adding getModel method to retrieve a valid model

## 0.0.4 (2015-09-27)

- Adding addCrud method to enable crud flag from model
- Finish load method for autoloading of models from given path
- Adding isLoaded method. This method get model load status 

## 0.0.3 (2015-09-27)

- Adding get et getOne statics method on crud Class
- Adding delete statics method on crud Class

## 0.0.2 (2015-09-27)

- Change controllers Method name to validators

## 0.0.1 (2015-09-25)

Adding all base function.
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
