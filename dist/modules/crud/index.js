/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V1.5.0 */
"use strict";function Crud(a){this.logger=a,this.alias={create:["insert"],get:["read"],getOne:["readOne"],"delete":["destroy"],update:["modify"]}}var logger=require("yocto-logger"),_=require("lodash"),Q=require("q"),Schema=require("mongoose").Schema;Crud.prototype.insert=function(){return this.create.apply(this,arguments)},Crud.prototype.read=function(){return this.get.apply(this,arguments)},Crud.prototype.readOne=function(){return this.getOne.apply(this,arguments)},Crud.prototype.modify=function(){return this.update.apply(this,arguments)},Crud.prototype.destroy=function(){return this["delete"].apply(this,arguments)},Crud.prototype.getOne=function(a,b){return this.get(a,b,"findOne")},Crud.prototype.get=function(a,b,c){c=_.isString(c)&&!_.isEmpty(c)?c:"find",c=_.isString(a)?"findById":c;var d=Q.defer();return b=_.isString(b)&&!_.isEmpty(b)?b:"",this[c](a,b,function(a,b){a?d.reject(a):d.resolve(b)}),d.promise},Crud.prototype["delete"]=function(a){var b=Q.defer();return _.isString(a)&&!_.isEmpty(a)?this.findByIdAndRemove(a,function(a,c){a?b.reject(a):b.resolve(c)}):b.reject(["Given id is not a string",_.isString(a)&&_.isEmpty(a)?" and is empty":""].join(" ")),b.promise},Crud.prototype.update=function(a,b,c){var d=_.isString(a)?"findByIdAndUpdate":"findOneAndUpdate",e=Q.defer();return _.isBoolean(c)&&c?this.where().setOptions({multi:!0}).update(a,b,function(a,b){a?e.reject(a):e.resolve(b)}):this[d](a,b,{"new":!0},function(a,b){a?e.reject(a):e.resolve(b)}),e.promise},Crud.prototype.create=function(a){var b=Q.defer(),c=_.isFunction(this.save)?this:new this,d=!0,e=[];return _.isFunction(this.validate)&&(d=this.validate(a),e=d.error,a=_.has(d,"value")?d.value:a,d=_.isNull(d.error)),d?c instanceof this?(_.extend(c,a),c.save(function(a,d){a?b.reject(a):this.schema.elastic?c.on("es-indexed",function(a){a?b.reject(["[ Crud.create ] - Indexes creation failed :",a].join(" ")):b.resolve(d)}):b.resolve(d)}.bind(this))):b.reject("[ Crud.create ] - Cannot save. invalid instance model"):b.reject(["[ Crud.create ] - Cannot save new schema.",e].join(" ")),b.promise},Crud.prototype.esearch=function(a,b){var c=Q.defer();return!_.isUndefined(this.search)&&_.isFunction(this.search)?this.search(a||{},b||{},function(a,b){a?c.reject(a):c.resolve(b)}):c.reject("Elastic search is not enabled. Cannot process a search request"),c.promise},Crud.prototype.add=function(a,b){if(!_.isObject(a)&&!(a instanceof Schema)||!_.isArray(b))return this.logger.warning("[ Crud.add ] - Schema or exclude item given is invalid"),!1;var c=["add"];a.elastic||c.push("elasticsearch");var d=_.difference(Object.keys(Crud.prototype),c);if(b=_.isArray(b)?b:[],!_.isEmpty(b)&&_.isArray(b)){var e=_.intersection(Object.keys(this.alias),b);_.each(e,function(a){b.push(this.alias[a])},this),b=_.flatten(b)}var f=_.difference(d,b);return _.each(f,function(b){_.isFunction(this[b])&&a["static"](b,this[b])}.bind(this)),a},module.exports=function(a){return(_.isUndefined(a)||_.isNull(a))&&(logger.warning("[ Crud.constructor ] - Invalid logger given. Use internal logger"),a=logger),new Crud(a)};