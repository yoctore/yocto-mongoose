/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V2.3.0 - Wed Jun 12 2019 18:35:41 GMT+0400 (+04)*/

"use strict";var mongoose=require("mongoose"),_=require("lodash"),moment=require("moment"),modules=[];function DateCrypt(e,t){mongoose.SchemaType.call(this,e,t,"Date_crypt")}DateCrypt.prototype=Object.create(mongoose.SchemaType.prototype),DateCrypt.prototype.cast=function(t,e,r){var o=null;try{if(r&&!_.isNull(t)){if(_.isObject(t)&&moment(t).isValid())return t;if(!modules.crypt.isAlreadyCrypted(t))throw new Error("[ Types.Date_crypt.cast ] - error when cast Date_crypt, the value : "+t+"can't be casted as Date");o=modules.crypt.decrypt(t),o=new Date(o)}}catch(e){throw new Error("[ Types.Date_crypt.cast ] - error when casting value : < "+t+" >, error : ",e)}return _.isNull(o)?t:o},module.exports=function(e){return modules=e,DateCrypt};