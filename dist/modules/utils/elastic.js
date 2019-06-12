/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V2.3.0 - Wed Jun 12 2019 18:35:41 GMT+0400 (+04)*/

"use strict";var logger=require("yocto-logger"),_=require("lodash"),utils=require("yocto-utils");function ElasticUtils(t){this.logger=t,this.hosts=["127.0.0.1:9200"],this.options={},this.isReady=!1}ElasticUtils.prototype.addDefaultIndexes=function(i){return i&&_.isObject(i)?_.isArray(i)?_.map(i,this.addDefaultIndexes.bind(this)):_.reduce(Object.keys(i),function(t,s){return _.isObject(i[s])&&_.merge(i[s],utils.obj.underscoreKeys({esIndexed:!1})),t[s]=this.addDefaultIndexes(i[s]),t}.bind(this),{}):i},ElasticUtils.prototype.getHosts=function(){return this.hosts},ElasticUtils.prototype.getOptions=function(){return this.options},ElasticUtils.prototype.enableHosts=function(t,s){return!(!_.isArray(t)||_.isEmpty(t))&&(this.hosts=t,this.options=s||{},this.isReady=!0)},ElasticUtils.prototype.configIsReady=function(){return this.isReady},module.exports=function(t){return(_.isUndefined(t)||_.isNull(t))&&(logger.warning("[ ElasticUtils.constructor ] - Invalid logger given. Use internal logger"),t=logger),new ElasticUtils(t)};