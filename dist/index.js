/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V1.0.0 */
function YMongoose(a){this.logger=a,this.mongoose=mongoose,this.paths={model:"",validator:""},this.crud=!1,this.loaded=!1}var logger=require("yocto-logger"),crud=require("./modules/crud")(logger),validator=require("./modules/validator")(logger),mongoose=require("mongoose"),_=require("lodash"),Promise=require("promise"),path=require("path"),fs=require("fs"),glob=require("glob"),joi=require("joi"),async=require("async"),Schema=mongoose.Schema;YMongoose.prototype.isConnected=function(){return this.mongoose.connection.readyState===this.mongoose.Connection.STATES.connected},YMongoose.prototype.isDisconnected=function(){return this.mongoose.connection.readyState===this.mongoose.Connection.STATES.disconnected},YMongoose.prototype.connect=function(a,b){var c=this;return this.logger.info("[ YMongoose.connect ] - Try to create a connection."),new Promise(function(d,e){c.mongoose.connection.on("open",function(){c.logger.info("[ YMongoose.connect ] - Connection successful."),d()}),c.mongoose.connection.on("error",function(a){c.logger.error(["[ YMongoose.connect ] - Connection failed.","Error is :",a.message].join(" ")),e(a)}),_.isString(a)&&!_.isEmpty(a)?(b=_.isObject(b)&&!_.isEmpty(b)?b:{},c.mongoose.connect(a,b)):(c.logger.error("[ YMongoose.connect ] - Invalid url, cannot connect."),e())})},YMongoose.prototype.disconnect=function(){var a=this;return this.logger.info("[ YMongoose.disconnect ] - Try to disconnect all connections."),new Promise(function(b,c){a.isConnected()?a.mongoose.disconnect(function(d){d?(a.logger.error(["[ YMongoose.disconnect ] - Disconnect failed.","Error is :",d.message].join(" ")),c(d)):(a.logger.info("[ YMongoose.disconnect ] - Disconnect successful."),b())}):(a.logger.warning("[ YMongoose.disconnect ] - Cannot disconnect orm is not connected."),c())})},YMongoose.prototype.setPath=function(a,b){if(b=_.isBoolean(b)&&b?b:!1,_.isString(a)&&!_.isEmpty(a)){a=path.isAbsolute(a)?a:path.normalize([process.cwd(),a].join("/"));try{fs.accessSync(a,fs.R_OK);var c=fs.statSync(a);if(!c.isDirectory())throw[a,"is not a valid directory."].join(" ");var d=glob.sync(["*.",b?"js":"json"].join(" "),{cwd:a});0===d.length&&this.logger.warning(["[ YMongoose.setPath ] - Given directory path for",b?"Validators":"Models","seems to be empty.","Don't forget to ad your",b?"js":"json","file before load call"].join(" ")),this.paths[b?"validator":"model"]=a,this.logger.info(["[ YMongoose.setPath ] -",b?"Validators":"Models","path was set to :",this.paths[b?"validator":"model"]].join(" "))}catch(e){return this.logger.error(["[ YMongoose.setPath ] - Set path for",b?"Validators":"Models","failed.",e].join(" ")),this.disconnect(),!1}return!0}return this.logger.error("[ YMongoose.setPath ] - Cannot set model directory. Invalid directory given."),!1},YMongoose.prototype.isLoaded=function(){return this.loaded},YMongoose.prototype.isReady=function(a){return a&&(this.isConnected()||this.logger.error("[ YMongoose.isReady ] - Connection is not ready."),_.isEmpty(this.paths.model)&&this.logger.error("[ YMongoose.isReady ] - Model definition path is not set."),_.isEmpty(this.paths.validator)&&this.logger.error("[ YMongoose.isReady ] - Validator definition path is not set.")),this.isConnected()&&!_.isEmpty(this.paths.model)&&!_.isEmpty(this.paths.validator)},YMongoose.prototype.models=function(a){return this.logger.info("[ YMongoose.models ] - Try to set model defintion path."),this.setPath(a)},YMongoose.prototype.validators=function(a){return this.logger.info("[ YMongoose.validators ] - Try to set validator defintion path."),this.setPath(a,!0)},YMongoose.prototype.addModel=function(a){if(this.isReady(!0)){if(!_.isObject(a)||_.isEmpty(a)||!_.has(a,"model")||!_.has(a.model,"properties")||!_.has(a.model,"name"))return this.logger.error("[ YMongoose.addModel ] - Cannot create model. Invalid data given"),!1;this.logger.info(["[ YMongoose.addModel ] - Creating model :",a.model.name].join(" "));var b=new Schema(a.model.properties);if(a.model.crud.enable){this.logger.info("[ YMongoose.addModel ] - Crud mode is enabled. try to ass defined method");var c=this.createCrud(b,a.model.crud.exclude);c&&(this.logger.info("[ YMongoose.addModel ] - Add new schema with generated crud method"),b=c)}if(!_.isUndefined(a.model.validator)&&!_.isNull(a.model.validator)&&_.isString(a.model.validator)&&!_.isEmpty(a.model.validator)){this.logger.info(["[ YMongoose.addModel ] - A validator is defined try","to add validate method"].join(" "));var d=this.createValidator(b,a.model.validator);d&&(this.logger.info("[ YMongoose.addModel ] - Add new schema with given validtor method"),b=d)}return this.mongoose.model(a.model.name,b)}return!1},YMongoose.prototype.createCrud=function(a,b){return this.isReady(!0)?a instanceof Schema?crud.add(a,b):(this.logger.warning([" [ YMongoose.createCrud ] - Cannot process."," given schema is not an instanceof Schema"].join(" ")),!1):!1},YMongoose.prototype.createValidator=function(a,b){return this.isReady(!0)?a instanceof Schema?validator.add(a,this.paths.validator,b):(this.logger.warning([" [ YMongoose.createValidator ] - Cannot process."," given schema is not an instanceof Schema"].join(" ")),!1):!1},YMongoose.prototype.load=function(){var a=this,b=[],c={total:0,processed:0};return new Promise(function(d,e){var f=glob.sync("*.json",{cwd:a.paths.model,realpath:!0}),g=joi.object().keys({model:joi.object().keys({name:joi.string().required(),properties:joi.object().required(),crud:joi.object().keys({enable:joi["boolean"]().required(),exclude:joi.array().empty()}).allow("enable","exclude"),validator:joi.string().optional()}).unknown()}).unknown(),h=async.queue(function(b,d){var e=joi.validate(b.data,g);if(_.isNull(e.error)){var f=a.addModel(b.data);f?(c.processed++,d()):d(["Cannot create model for  [",b.file,"]"].join(" "))}else{var h=["Invalid schema for [",b.file,"] Error is :",e.error].join(" ");a.logger.warning(["[ YMongoose.load.queue ] -",h].join(" ")),d(h)}},100);h.drain=function(){a.logger.info("[ YMongoose.load.queue.drain ] - Process Queue Complete."),a.logger.debug(["[ YMongoose.load.queue.drain ] - Statistics -","[ Added on queue :",c.total,c.total>1?"items":"item","] -","[ Processed :",c.processed,c.processed>1?"items":"item","] -","[ Errors :",b.length,b.length>1?"items":"item","]"].join(" ")),a.loaded=c.processed===c.total,a.loaded?(a.logger.info("[ YMongoose.load.queue.drain ] - All item was processed."),d()):(a.logger.error(["[ YMongoose.load.queue.drain ] -","All item was NOT correctly processed.","Check your logs."].join(" ")),e(),a.disconnect())},_.each(f,function(d){try{var g=d.replace(path.dirname(d),""),i=JSON.parse(fs.readFileSync(d,"utf-8"));c.total++,h.push({file:g,data:i},function(c){c&&(a.logger.warning(["[ YMongoose.load ] - Cannot add item to queue for [",g,"]"].join(" ")),b.push(c))})}catch(j){if(this.logger.warning(["[ YMongoose.load ] - cannot add item to queue.","Error is : [",j,"] for [",g,"]"].join(" ")),_.last(f)===d&&0===c.total){var k="All loaded data failed during JSON.parse(). Cannot continue.";this.logger.error(["[ YMongoose.load ] -",k].join(" ")),e(k),this.disconnect()}}},a)})},YMongoose.prototype.getModel=function(a,b){if(this.isReady(!0)&&this.isLoaded()&&_.isString(a)&&!_.isEmpty(a))try{var c=this.mongoose.model(a);return _.isBoolean(b)&&b?new c:c}catch(d){return this.logger.error("[ YMongoose.getModel ] - Model not found. Invalid schema name given."),this.logger.debug(["[ YMongoose.getModel ] -",d].join(" ")),!1}return this.logger.error("[ YMongoose.getModel ] - Cannot get model. Invalid schema name given."),!1},YMongoose.prototype.addStatic=function(a,b,c){return this.addFn(a,b,c,!1)},YMongoose.prototype.addMethod=function(a,b,c){return this.addFn(a,b,c,!0)},YMongoose.prototype.addFn=function(a,b,c,d){if(d=_.isBoolean(d)&&d?"method":"static",this.isReady(!0)&&this.isLoaded()&&_.isFunction(c)&&_.isString(a)&&!_.isEmpty(a)&&_.isString(b)&&!_.isEmpty(b)){var e=this.getModel(a);if(e){var f=e.schema;if(!_.isFunction(f.statics[b]))return f[d](b,c),delete this.mongoose.models[a],this.mongoose.model(a,f),!0;this.logger.warning(["[ YMongoose.addFn ] - Cannot add ",d," on ",a,"."," Given method [ ",b," ] already exists"].join(""))}else this.logger.error(["[ YMongoose.addFn ] - Cannot add",d,"Search model is not found"].join(" "))}else this.logger.error(["[ YMongoose.addFn ] - Cannot add new method.","Invalid name or given Function is not valid"].join(" "));return!1},module.exports=function(a){return(_.isUndefined(a)||_.isNull(a))&&(logger.warning("[ YMongoose.constructor ] - Invalid logger given. Use internal logger"),a=logger),new YMongoose(a)};