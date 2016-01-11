/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V1.3.0 */
"use strict";function Method(a){this.logger=a}var glob=require("glob"),logger=require("yocto-logger"),_=require("lodash"),Schema=require("mongoose").Schema,joi=require("joi"),utils=require("yocto-utils");Method.prototype.add=function(a,b,c,d){if(_.isString(b)&&_.isArray(c)&&!_.isEmpty(b)&&!_.isEmpty(c)&&_.isObject(a)&&a instanceof Schema&&_.isString(d)&&!_.isEmpty(d)){var e=glob.sync(["**/",d,".js"].join(""),{cwd:b,realpath:!0,nocase:!0});if(e.length>0)return _.each(e,function(b){var d=require(b);_.each(c,function(b){var c=joi.object().keys({type:joi.string().required().empty().allow(["static","method","post"]),name:joi.string().required().empty(),event:joi.alternatives().when("type",{is:"post",then:joi.string().required().empty().valid(["init","validate","save","remove","count","find","findOne","findOneAndRemove","findOneAndUpdate","update"]),otherwise:joi.optional()})}),e=joi.validate(b,c);_.isNull(e.error)?_.has(d,b.name)&&_.isFunction(d[b.name])&&(this.logger.debug(["[ Method.add ] - Method [",b.name,"] founded adding new","method"===b.type?"instance":b.type,"method for given schema"].join(" ")),"post"===b.type?a.post(b.event,function(){return d[b.name].apply(this,_.flatten([arguments,this.logger]))}.bind(this)):a[b.type](b.name,function(){return d[b.name].apply(this,arguments)})):this.logger.error(["[ Method.add ] - Cannot add method for item",utils.obj.inspect(b),e.error].join(" "))},this)},this),a;this.logger.warning(["[ Method.add ] - Given directory path for","Methods seems to be empty.","Cannot add method on schema."].join(" "))}else this.logger.error("[ Method.add ] - cannot process invalid path / name or schema given.");return!1},module.exports=function(a){return(_.isUndefined(a)||_.isNull(a))&&(logger.warning("[ Method.constructor ] - Invalid logger given. Use internal logger"),a=logger),new Method(a)};