/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V1.0.3 */
"use strict";function YMongoose(a){this.logger=a,this.mongoose=mongoose,this.paths={model:"",validator:"",method:"",enums:""},this.crud=!1,this.loaded=!1}var logger=require("yocto-logger"),crud=require("./modules/crud")(logger),validator=require("./modules/validator")(logger),method=require("./modules/method")(logger),enums=require("./modules/enum")(logger),mongoose=require("mongoose"),_=require("lodash"),path=require("path"),fs=require("fs"),glob=require("glob"),joi=require("joi"),async=require("async"),Schema=mongoose.Schema,Q=require("q");YMongoose.prototype.isConnected=function(){return this.mongoose.connection.readyState===this.mongoose.Connection.STATES.connected},YMongoose.prototype.isDisconnected=function(){return this.mongoose.connection.readyState===this.mongoose.Connection.STATES.disconnected},YMongoose.prototype.connect=function(a,b){var c=Q.defer(),d=this;return this.logger.info(["[ YMongoose.connect ] -","Try to create a database connection on [",a,"]"].join(" ")),d.mongoose.connection.on("open",function(){d.logger.info(["[ YMongoose.connect ] - Connection successful on",a].join(" ")),c.resolve()}),d.mongoose.connection.on("error",function(a){d.logger.error(["[ YMongoose.connect ] - Connection failed.","Error is :",a.message].join(" ")),c.reject(a)}),_.isString(a)&&!_.isEmpty(a)?(b=_.isObject(b)&&!_.isEmpty(b)?b:{},d.mongoose.connect(a,b)):(d.logger.error("[ YMongoose.connect ] - Invalid url, cannot connect."),c.reject()),c.promise},YMongoose.prototype.disconnect=function(){var a=Q.defer(),b=this;return this.logger.info("[ YMongoose.disconnect ] - Try to disconnect all connections"),this.isConnected()?this.mongoose.disconnect(function(c){c?(b.logger.error(["[ YMongoose.disconnect ] - Disconnect failed.","Error is :",c.message].join(" ")),a.reject(c)):(b.logger.info("[ YMongoose.disconnect ] - Disconnect successful."),a.resolve())}):(this.logger.warning("[ YMongoose.disconnect ] - Cannot disconnect orm is not connected."),a.reject()),a.promise},YMongoose.prototype.models=function(a){return this.logger.debug("[ YMongoose.models ] - Try to set model defintion path."),this.setPath(a)},YMongoose.prototype.validators=function(a){return this.logger.debug("[ YMongoose.validators ] - Try to set validator defintion path."),this.setPath(a,"validator")},YMongoose.prototype.methods=function(a){return this.logger.debug("[ YMongoose.methods ] - Try to set methods defintion path."),this.setPath(a,"method")},YMongoose.prototype.enums=function(a){return this.logger.debug("[ YMongoose.enums ] - Try to set enums defintion path."),this.setPath(a,"enums")},YMongoose.prototype.setPath=function(a,b){var c={model:{ext:"json",name:"model"},validator:{ext:"js",name:"validator"},method:{ext:"js",name:"method"},enums:{ext:"json",name:"enums"}},d=_.find(c,"name",b);if(!_.isUndefined(d)&&_.isObject(d)&&_.isString(a)&&!_.isEmpty(a)){a=path.isAbsolute(a)?a:path.normalize([process.cwd(),a].join("/"));try{fs.accessSync(a,fs.R_OK);var e=fs.statSync(a);if(!e.isDirectory())throw[a,"is not a valid directory."].join(" ");var f=glob.sync(["**/*.",d.ext].join(""),{cwd:a});0===f.length&&this.logger.warning(["[ YMongoose.setPath ] - Given directory path for",[d.name,"enums"!==d.name?"s":""].join(""),"seems to be empty.","Don't forget to ad your",d.ext,"file before load call"].join(" ")),this.paths[d.name]=a,this.logger.debug(["[ YMongoose.setPath ] -",_.capitalize([d.name,"enums"!==d.name?"s":""].join("")),"path was set to :",this.paths[d.name]].join(" "))}catch(g){return this.logger.error(["[ YMongoose.setPath ] - Set path for",[d.name,"enums"!==d.name?"s":""].join(""),"failed.",g].join(" ")),this.disconnect(),!1}return!0}return this.logger.error(["[ YMongoose.setPath ] - Cannot set directory for [",b,"]","Invalid directory given or cannot retreive types rules"].join(" ")),!1},YMongoose.prototype.isLoaded=function(){return this.loaded},YMongoose.prototype.isReady=function(a){return a&&(this.isConnected()||this.logger.error("[ YMongoose.isReady ] - Connection is not ready."),_.isEmpty(this.paths.model)&&this.logger.error("[ YMongoose.isReady ] - Model definition path is not set."),_.isEmpty(this.paths.validator)&&this.logger.error("[ YMongoose.isReady ] - Validator definition path is not set."),_.isEmpty(this.paths.method)&&this.logger.error("[ YMongoose.isReady ] - Methods definition path is not set."),_.isEmpty(this.paths.enums)&&this.logger.warning("[ YMongoose.isReady ] - Enum definition path is not set.")),this.isConnected()&&!_.isEmpty(this.paths.model)&&!_.isEmpty(this.paths.validator)&&!_.isEmpty(this.paths.method)},YMongoose.prototype.addModel=function(a){if(this.isReady(!0)){if(!_.isObject(a)||_.isEmpty(a)||!_.has(a,"model")||!_.has(a.model,"properties")||!_.has(a.model,"name"))return this.logger.error("[ YMongoose.addModel ] - Cannot create model. Invalid data given"),!1;this.logger.debug(["[ YMongoose.addModel ] - Creating model [",a.model.name,"]"].join(" "));var b=new Schema(a.model.properties);if(_.has(a.model,"crud")&&_.has(a.model.crud,"enable")&&_.isObject(a.model.crud)&&a.model.crud.enable){this.logger.debug(["[ YMongoose.addModel ] - Crud mode is enabled.","Try to add default methods"].join(" "));var c=this.createCrud(b,a.model.crud.exclude);c&&(this.logger.debug(["[ YMongoose.addModel ] - Adding Crud method success"].join(" ")),b=c)}if(!_.isUndefined(a.model.validator)&&!_.isNull(a.model.validator)&&_.isString(a.model.validator)&&!_.isEmpty(a.model.validator)){this.logger.debug(["[ YMongoose.addModel ] - A validator is defined.","Try to add a validate method."].join(" "));var d=this.createValidator(b,a.model.validator);d&&(this.logger.debug(["[ YMongoose.addModel ] - Adding validate method success"].join(" ")),b=d)}if(!_.isUndefined(a.model.fn)&&!_.isNull(a.model.fn)&&_.isArray(a.model.fn)&&!_.isEmpty(a.model.fn)){this.logger.debug(["[ YMongoose.addModel ] - External methods are defined.","Try to add them."].join(" "));var e=this.createMethod(b,a.model.fn);e&&(this.logger.debug(["[ YMongoose.addModel ] - Adding external methods success"].join(" ")),b=e)}return _.isEmpty(this.paths.enums)||(enums.load(this.paths.enums)?this.logger.debug("[ YMongoose.addModel ] - loading enums value success"):this.logger.warning("[ YMongoose.addModel ] - loading enums value failed")),b["static"]("enums",function(){return enums}),this.mongoose.model(a.model.name,b)}return!1},YMongoose.prototype.createCrud=function(a,b){return this.isReady(!0)?a instanceof Schema?crud.add(a,b):(this.logger.warning([" [ YMongoose.createCrud ] - Cannot process."," given schema is not an instanceof Schema"].join(" ")),!1):!1},YMongoose.prototype.createValidator=function(a,b){return this.isReady(!0)?a instanceof Schema?validator.add(a,this.paths.validator,b):(this.logger.warning([" [ YMongoose.createValidator ] - Cannot process."," given schema is not an instanceof Schema"].join(" ")),!1):!1},YMongoose.prototype.createMethod=function(a,b){return this.isReady(!0)?a instanceof Schema?method.add(a,this.paths.method,b):(this.logger.warning([" [ YMongoose.createMethod ] - Cannot process."," given schema is not an instanceof Schema"].join(" ")),!1):!1},YMongoose.prototype.load=function(){var a=Q.defer(),b=this,c=[],d={total:0,processed:0},e=glob.sync("**/*.json",{cwd:this.paths.model,realpath:!0}),f=joi.object().keys({model:joi.object().keys({name:joi.string().required(),properties:joi.object().required(),crud:joi.object().required().keys({enable:joi["boolean"]().required(),exclude:joi.array().required().empty()}).allow("enable","exclude"),validator:joi.string().optional()}).unknown()}).unknown(),g=async.queue(function(a,c){var e=joi.validate(a.data,f);if(b.logger.debug(["----------------------------","Processing : [",a.file,"]","----------------------------"].join(" ")),_.isNull(e.error)){var g=b.addModel(a.data);g?(d.processed++,c()):c(["Cannot create model for  [",a.file,"]"].join(" "))}else{var h=["Invalid schema for [",a.file,"] Error is :",e.error].join(" ");b.logger.error(["[ YMongoose.load.queue ] -",h].join(" ")),c(h)}},100);return g.drain=function(){b.logger.debug(["---------------------------- [","Process Queue Complete.","] ----------------------------"].join(" ")),b.logger.debug(["[ YMongoose.load.queue.drain ] - Statistics -","[ Added on queue :",d.total,d.total>1?"items":"item","] -","[ Processed :",d.processed,d.processed>1?"items":"item","] -","[ Errors :",c.length,c.length>1?"items":"item","]"].join(" ")),b.loaded=d.processed===d.total,b.loaded?(b.logger.info("[ YMongoose.load ] - All Model was processed & loaded."),a.resolve()):(b.logger.error(["[ YMongoose.load ] -","All item was NOT correctly processed.","Check your logs."].join(" ")),a.reject(),b.disconnect())},_.each(e,function(f){try{var h=f.replace(path.dirname(f),""),i=JSON.parse(fs.readFileSync(f,"utf-8"));d.total++,g.push({file:h,data:i},function(a){a&&(b.logger.error(["[ YMongoose.load ] - Cannot add item to queue for [",h,"]"].join(" ")),c.push(a))})}catch(j){if(this.logger.warning(["[ YMongoose.load ] - cannot add item to queue.","Error is : [",j,"] for [",h,"]"].join(" ")),_.last(e)===f&&0===d.total){var k="All loaded data failed during JSON.parse(). Cannot continue.";this.logger.error(["[ YMongoose.load ] -",k].join(" ")),a.reject(k),this.disconnect()}}},this),a.promise},YMongoose.prototype.getModel=function(a,b){if(this.isReady(!0)&&this.isLoaded()&&_.isString(a)&&!_.isEmpty(a))try{var c=this.mongoose.model(a);return _.isBoolean(b)&&b?new c:c}catch(d){return this.logger.error("[ YMongoose.getModel ] - Model not found. Invalid schema name given."),this.logger.debug(["[ YMongoose.getModel ] -",d].join(" ")),!1}return this.logger.error("[ YMongoose.getModel ] - Cannot get model. Invalid schema name given."),!1},module.exports=function(a){return(_.isUndefined(a)||_.isNull(a))&&(logger.warning("[ YMongoose.constructor ] - Invalid logger given. Use internal logger"),a=logger),new YMongoose(a)};