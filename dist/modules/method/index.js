/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V2.2.0 */

"use strict";var glob=require("glob"),logger=require("yocto-logger"),_=require("lodash"),Schema=require("mongoose").Schema,joi=require("joi"),utils=require("yocto-utils"),stackTrace=require("stack-trace");function Method(e){this.logger=e}Method.prototype.add=function(o,e,t,i,a){if(_.isString(e)&&_.isArray(t)&&!_.isEmpty(e)&&!_.isEmpty(t)&&_.isObject(o)&&o instanceof Schema&&_.isString(i)&&!_.isEmpty(i)){var n=glob.sync(["**/",i,".js"].join(""),{cwd:e,realpath:!0,nocase:!0});if(0<n.length)return _.each(n,function(e){var r=require(e);_.each(t,function(e){var t=joi.object().keys({type:joi.string().required().empty().valid(["static","method","post","pre"]),name:joi.string().required().empty(),event:joi.optional().when("type",{is:"post",then:joi.string().required().empty().valid(["init","validate","save","remove","count","find","findOne","findOneAndRemove","findOneAndUpdate","update"])}),redis:joi.object().optional().keys({enable:joi.boolean().required().default(!1),expire:joi.number().optional().min(0).default(0)})}),i=joi.validate(e,t);if(_.isNull(i.error))if(_.has(r,e.name)&&_.isFunction(r[e.name])){if(this.logger.debug(["[ Method.add ] - Method [",e.name,"] founded adding new","method"===e.type?"instance":e.type,"method for given schema"].join(" ")),"post"!==e.type&&"pre"!==e.type||!_.isString(e.event)||_.isEmpty(e.event))o[e.type](e.name,function(){return r[e.name].apply(this,arguments)});else{this.logger.debug(["[ Method.add ] - Adding [",e.type," ] hook on current schema for event [",e.event,"]"].join(" "));var n=this.logger;"post"===e.type?o.post(e.event,function(){return r[e.name].apply(this,_.flatten([arguments,n]))}):(console.log("\n item : ",e),o.pre(e.event,function(){return r[e.name].apply(this,_.flatten([arguments,n]))}))}e.redis&&(_.isArray(o.redisExpireTimeByKey)||(o.redisExpireTimeByKey=[]),_.has(e.redis,"enable")&&e.redis.enable&&(o.redisExpireTimeByKey.push(_.set({},e.name,e.redis.expire)),o.static("redis",function(){var e=stackTrace.get()[1];_.isObject(e)&&(e=(e=e.getFunctionName()).replace("exports.",""));var t=_.result(_.find(this.schema.redisExpireTimeByKey,e),e);return{instance:a,expire:t||0}})))}else this.logger.warning(["[ Method.add ] - Cannot found method [",e.name,"] for current model"].join(" "));else this.logger.error(["[ Method.add ] - Cannot add method for item",utils.obj.inspect(e),i.error].join(" "))}.bind(this))}.bind(this)),o;this.logger.warning(["[ Method.add ] - Given directory path for","Methods seems to be empty.","Cannot add method on schema."].join(" "))}else this.logger.error("[ Method.add ] - cannot process invalid path / name or schema given.");return!1},module.exports=function(e){return(_.isUndefined(e)||_.isNull(e))&&(logger.warning("[ Method.constructor ] - Invalid logger given. Use internal logger"),e=logger),new Method(e)};