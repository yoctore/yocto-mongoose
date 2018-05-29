/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V2.2.0 */

"use strict";var logger=require("yocto-logger"),_=require("lodash"),Q=require("q"),Schema=require("mongoose").Schema,modCrypt=require("../crypto");function Crud(e){this.logger=e,this.alias={create:["insert"],get:["read"],getOne:["readOne"],delete:["destroy"],update:["modify"]},this.crypt=modCrypt(e)}Crud.prototype.insert=function(){return this.create.apply(this,arguments)},Crud.prototype.read=function(){return this.get.apply(this,arguments)},Crud.prototype.readOne=function(){return this.getOne.apply(this,arguments)},Crud.prototype.modify=function(){return this.update.apply(this,arguments)},Crud.prototype.destroy=function(){return this.delete.apply(this,arguments)},Crud.prototype.getOne=function(e,t){return this.get(e,t,"findOne")},Crud.prototype.get=function(t,r,i){var n=this["findOne"===i?"getOneRedis":"getRedis"];i=_.isString(i)&&!_.isEmpty(i)?i:"find",i=_.isString(t)?"findById":i;var s=Q.defer();r=_.isString(r)&&!_.isEmpty(r)?r:"";var o=this;function a(e,t,r){e=o.crypto().prepareCryptQuery(e,!0),o[i](e,t,function(e,t){e?s.reject(e):(_.isObject(r)&&n.instance.add(r.key,t,r.expire),s.resolve(t))})}if(n){var c=_.merge(_.isString(t)?_.set([this.modelName,t].join("-"),t):t||{},r||{});n.instance.get(c).then(function(e){s.resolve(e)}).catch(function(e){a.call(this,t,r,_.isNull(e)?{key:c,expire:n.expire}:e)}.bind(this))}else a.call(this,t,r);return s.promise},Crud.prototype.delete=function(e){var r=Q.defer();return _.isString(e)&&!_.isEmpty(e)?this.findByIdAndRemove(e,function(e,t){e?r.reject(e):r.resolve(t)}):r.reject(["Given id is not a string",_.isString(e)&&_.isEmpty(e)?" and is empty":""].join(" ")),r.promise},Crud.prototype.update=function(e,t,r){var i=_.isString(e)?"findByIdAndUpdate":"findOneAndUpdate";t=this.crypto().prepareCryptQuery(t),e=this.crypto().prepareCryptQuery(e);var n=Q.defer();return _.isBoolean(r)&&r?this.where().setOptions({multi:!0}).update(e,t,function(e,t){e?n.reject(e):n.resolve(t)}):this[i](e,t,{new:!0},function(e,t){e?n.reject(e):n.resolve(t)}),n.promise},Crud.prototype.create=function(e){var r=Q.defer(),i=_.isFunction(this.save)?this:new this,t=!0,n=[];return _.isFunction(this.validate)&&(n=(t=this.validate(e)).error,e=_.has(t,"value")?t.value:e,t=_.isNull(t.error)),t?i instanceof this?(e=this.crypto().prepareCryptQuery(e),_.merge(i,e),i.save(function(e,t){e?r.reject(e):this.schema.elastic?i.on("es-indexed",function(e){e?r.reject(["[ Crud.create ] - Indexes creation failed :",e].join(" ")):r.resolve(t)}):r.resolve(t)}.bind(this))):r.reject("[ Crud.create ] - Cannot save. invalid instance model"):r.reject(["[ Crud.create ] - Cannot save new schema.",n].join(" ")),r.promise},Crud.prototype.esearch=function(e,t){var r=Q.defer();return!_.isUndefined(this.search)&&_.isFunction(this.search)?this.search(e||{},t||{},function(e,t){e?r.reject(e):r.resolve(t)}):r.reject("Elastic search is not enabled. Cannot process a search request"),r.promise},Crud.prototype.add=function(t,r,i,n){if(!_.isObject(t)&&!(t instanceof Schema)||!_.isArray(r))return this.logger.warning("[ Crud.add ] - Schema or exclude item given is invalid"),!1;var e=["add"];t.elastic||e.push("elasticsearch");var s=_.difference(Object.keys(Crud.prototype),e);if(r=_.isArray(r)?r:[],!_.isEmpty(r)&&_.isArray(r)){var o=_.intersection(Object.keys(this.alias),r);_.each(o,function(e){r.push(this.alias[e])}.bind(this)),r=_.flatten(r)}var a=_.difference(s,r);return _.each(a,function(e){_.isFunction(this[e])&&(i&&_.includes(i.value||[],e)&&t.static([e,"Redis"].join(""),{instance:n,expire:i.expire||0}),t.static(e,this[e]))}.bind(this)),t},module.exports=function(e){return(_.isUndefined(e)||_.isNull(e))&&(logger.warning("[ Crud.constructor ] - Invalid logger given. Use internal logger"),e=logger),new Crud(e)};