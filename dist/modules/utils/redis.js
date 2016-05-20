/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V1.7.0 */
"use strict";function RedisUtils(a){this.logger=a,this.hosts=[{host:"127.0.0.1",port:6379}],this.options={retry:2e3,enableReadyCheck:!0},this.isReady=!1,this.cluster=null,this.defaultExpireTime=0}var logger=require("yocto-logger"),_=require("lodash"),utils=require("yocto-utils"),Redis=require("ioredis"),joi=require("joi"),Q=require("q");RedisUtils.prototype.getHosts=function(){return this.hosts},RedisUtils.prototype.getOptions=function(){return this.options},RedisUtils.prototype.disconnect=function(){return _.isNull(this.cluster)?!1:this.cluster.disconnect()},RedisUtils.prototype.connect=function(a,b,c,d){var e=joi.array().required().items(joi.object().keys({host:joi.string().required().empty().ip({version:["ipv4","ipv6"]})["default"]("127.0.0.1"),family:joi.number().optional().valid([4,6]),password:joi.string().optional().empty().min(32),db:joi.number().optional(),port:joi.number().required()["default"](6380),tls:joi.object().optional().keys({ca:joi.string().required().empty()})})["default"]({host:"127.0.0.1",port:6380}))["default"]([{host:"127.0.0.1",port:6380}]),f=joi.validate(a,e);if(f.error)return this.logger.warning(["[ RedisUtils.connect ] - Invalid host config given :",f.error].join(" ")),!1;if(_.isNumber(c)&&c>0&&(this.defaultExpireTime=c),this.hosts=f.value,this.options=_.merge(this.options,b||{}),_.has(this.options,"retry")&&_.isNumber(this.options.retry)&&_.extend(this.options,{clusterRetryStrategy:function(){return this.options.retry}.bind(this)}),_.isBoolean(d)&&d)this.logger.info("[ RedisUtils.connect ] - Try to connect in a cluster mode"),this.cluster=new Redis.Cluster(this.hosts,this.options);else{var g=_.first(f.value);this.logger.info("[ RedisUtils.connect ] - Try to connect in classic mode"),_.size(f.value)>1&&this.logger.warning(["[ RedisUtils.connect ] - Redis is not starting on cluster mode","connections parameters used will be the first item of current config."].join(" ")),this.cluster=new Redis(g)}return this.listenEvents()},RedisUtils.prototype.normalizeKey=function(a){return _.snakeCase(_.deburr(JSON.stringify(a))).toLowerCase()},RedisUtils.prototype.set=function(a,b,c){return this.add(a,b,c)},RedisUtils.prototype.add=function(a,b,c){return c=_.isNumber(c)&&c>0?c:this.defaultExpireTime,a=this.normalizeKey(a),this.isReady&&(c>0?(this.logger.debug(["[ RedisUtils.add ] - Adding key [",a,"] with [",c,"] seconds of expires times,","with value :",utils.obj.inspect(b)].join(" ")),this.cluster.set(a,JSON.stringify(b),"EX",c)):(this.logger.debug(["[ RedisUtils.add ] - Adding key [",a,"] with value :",utils.obj.inspect(b)].join(" ")),this.cluster.set(a,JSON.stringify(b)))),this.get(a)},RedisUtils.prototype.remove=function(a){return a=this.normalizeKey(a),this.isReady?(this.cluster.del(a),this.logger.debug(["[ RedisUtils.remove ] - Remmove the key [",a,"]"].join(" ")),!0):(this.logger.warning(["[ RedisUtils.remove ] - The key [",a,"] was not removed because connection is down"].join(" ")),!1)},RedisUtils.prototype["delete"]=function(a){return this.remove(a)},RedisUtils.prototype.get=function(a){var b=Q.defer();return this.isReady?this.cluster.get(this.normalizeKey(a),function(c,d){c?(this.logger.error(["[ RedisUtils.get ] - Cannot get value for key [",this.normalizeKey(a),"] on redis :",c].join(" ")),b.reject(c)):_.isNull(d)?b.reject(d):b.resolve(JSON.parse(d))}.bind(this)):b.reject("Redis is not ready cannot process get action"),b.promise},RedisUtils.prototype.listenEvents=function(){var a=[{key:"connect",message:"is connecting"},{key:"ready",message:"is ready"},{key:"error",message:"errored"},{key:"close",message:"is closing"},{key:"reconnecting",message:"is reconnecting"},{key:"end",message:"is ending"},{key:"+node",message:"connecting to a new node"},{key:"-node",message:"disconnecting from a node"},{key:"node error",message:"is on error on a node"}];return _.each(a,function(a){this.cluster.on(a.key,function(b){"ready"===a.key&&(this.isReady=!0),_.includes(["error","close","reconnecting","end","node error"],a.key)&&(this.isReady=!1),this.logger["ready"!==a.key?"debug":"info"](["[ RedisUtils.listenEvents ] – Redis",a.message,b?["=>",b].join(" "):""].join(" "))}.bind(this))}.bind(this)),!0},module.exports=function(a){return(_.isUndefined(a)||_.isNull(a))&&(logger.warning("[ RedisUtils.constructor ] - Invalid logger given. Use internal logger"),a=logger),new RedisUtils(a)};