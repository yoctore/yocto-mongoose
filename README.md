[![NPM](https://nodei.co/npm/yocto-mongoose.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/yocto-mongoose/)

![alt text](https://david-dm.org/yoctore/yocto-mongoose.svg "Dependencies Status")
[![Code Climate](https://codeclimate.com/github/yoctore/yocto-mongoose/badges/gpa.svg)](https://codeclimate.com/github/yoctore/yocto-mongoose)
[![Test Coverage](https://codeclimate.com/github/yoctore/yocto-mongoose/badges/coverage.svg)](https://codeclimate.com/github/yoctore/yocto-mongoose/coverage)
[![Issue Count](https://codeclimate.com/github/yoctore/yocto-mongoose/badges/issue_count.svg)](https://codeclimate.com/github/yoctore/yocto-mongoose)
[![Build Status](https://travis-ci.org/yoctore/yocto-mongoose.svg?branch=master)](https://travis-ci.org/yoctore/yocto-mongoose)

## Overview

This module is a part of yocto node modules for NodeJS.

Please see [our NPM repository](https://www.npmjs.com/~yocto) for complete list of available tools (completed day after day).

This module provide a simple config validator tools for your node app.

## Motivation

Create an easy and ready to use connector & model builder based on mongoose.

## Folder structure

A specific folder structure was setup for database configuration : 

- enums : Contains all enums defined for database
- models : Contains all model definition for an automatic build
- validators : Contains all validator function defined on model configuration files 
- methods : Contains all methods defined on model configuration

All of these folders must be set up before any usage.
For sure it's possible to set your own directory for each items. (See How to setup path directory part)

## Dependencies & Validator

- Validate rules **MUST** be build with [joi](https://www.npmjs.com/package/joi) package
- Promise was build with [Q](https://www.npmjs.com/package/q) package

## Model type & list defintiion

- String
- ObjectId
- Boolean
- Object
- Array or []

## How to set directories path

A method was defined for each path

- models(path) : set directory for models files
- validators(path) : set directory for validators files
- methods(path) : set directory for methods files
- enums(path) : set directory for enums files

## How to define a new model

For this example we want to define "Notify" model.

> First you need to go in your models directory
> Create your own folder (not mandatory)
> Create a json file in created folder named like your model name (notify.json)
> Add you model definition on it (see below for example)

```javascript
{
  "model" : {
    "name" : "Notify", // !!! IMPORANT !!! => This is your model name.
    "crud" : { // !!! MANDATORY !!! you need define it all the time
      "enable"  : true, // Set to false if you d'ont need enable automatic add of crud method
      "exclude" : [] // define here witch method we want to exlude (see CRUD parts for available method)
    },
    "properties" : { // Define here your property
      "status" : {
        "required" : true,
        "type"     : "String"
      },
      "notify_type" : {
        "required" : true,
        "type"     : "String"
      }
    }
  }
}
```

> Save file, Build & Use (See How To use part)

## How to define a validator / function / enums  attached to the previous define model

### How to add a new validator

> First edit you notify.json file created before and set the validator properties by the name of needed function, for example my Function name is "testValidator"


```javascript
{
  "model" : {
    "name" : "Notify",
     .....
    "validator" : "testValidator",
  }
}
```

> Create your structure of directory in validators directory (not mandatory).
> Create your notify.js files that will be contain your validation rules.
> Add into this files your new validation rules

```javascript
'use strict';

var joi = require('joi');

// valid account schema
exports.testValidator = function(data) {
  return joi.object().keys({
    a : joi.string()
  });
};
```

> Save file, Build & Use (See How To use part)

### How to add new function(s)

> First edit your notify.json file and add an "fn" properties, and add list of your methods :

```javascript
{
  "model" : {
    "name" : "Notify",
     .....
    "validator" : "testValidator",
    "fn"        : [
      {
        "type"  : "static", // create a static method on schema 
        "name"  : "test1" 
      },
      {
        "type"  : "method", // create a instance method on schema 
        "name"  : "test2" 
      }
  }
}
```

> Create your structure of directory in methods directory (not mandatory).

```javascript
// test 1
exports.test1 = function() {
    console.log('test1')
};
// test2
exports.test2 = function() {
  console.log('test2');
};
```

> Save file, Build & Use (See How To use part)

**!!! IMPORTANT !!!** Each function will be executed in schema context, so crud or mongoose method was available.

### Add enum value(s)

> Create a "file.json" into enums directory

> Add item like this : 

```javascript
[
  {
    "name"  : "notify_type_list",
    "value" : [ "email", "sms", "notification" ]
  },
  {
    "name"  : "notify_status_list",
    "value" : [ "pending", "processed", "error" ]
  }	
]
```

> Use it on your validator by injection dependencices to retreive a value :

```javascript
exports.testValidator = function (enums) {
  var status  = enums().get('notify_status_list');
  var type    = enums().get('notify_type_list');
 // your code here
}
```

## CRUD methods

All defined model have CRUD Method attached by mongoose static function.

See Below list of method & aliases : 

| Operation        | Available Method | Alias(es)       |
|------------------|------------------|-----------------|
| Create           | create           | insert          |
| Read (Retrieve)  | get              | read            |
| Update (Modify   | update           | modify          |
| Delete (Destroy) | delete           | destroy         |


## Elasticsearch implementation 

### Basic usage

Elastic search implemantion are builed with [mongoosastic](https://www.npmjs.com/package/mongoosastic) package

Elastic search rules are setted up during model build.
You can define index directly on model definition. See a simple example below : 

```javascript
{
  "model" : {
    "name" :
    "crud" : { 
      "enable"  : true, 
      "exclude" : [] 
    },
    "elastic" : {
      "enable" : true, // !!! IMPORTANT !!! must be provide to enable elastic search mapping
      "options" : {} // see : https://github.com/mongoosastic/mongoosastic#setup (host, hosts, protocol, port is removed if given : See multiple host usage)
    },
    "properties" : { 
      "status" : {
        "required" : true,
        "type"     : "String"
        "es_indexed" : true // here we define that this properties must be indexed.
        "es_type"    : "String" // another possible value
        "es_include_in_parent" : true // same thing 
      },
      "notify_type" : {
        "required" : true,
        "type"     : "String"
      }
    }
  }
}
```

### List of available keys

For more complex implementation see [mongoosastic](https://www.npmjs.com/package/mongoosastic) package documentation to see available keys

### Setting up multipe host

You can provide to our package a multiple hosts connection for elasticsearch part.
A method `elasticHosts` are available to define which hosts to use on `mongoosastic`.

```javascript

var db = require('yocto-mongoose')();

// Connect
db.connect('MONGO_URL').then(function() {
  db.elasticHosts([ { host : '127.0.0.1', port : 9200 } ]);
});

```