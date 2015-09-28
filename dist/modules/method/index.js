/* yocto-mongoose - Utility tool to manage mongoose connection and auto loading models. - V1.0.0 */
function Method(a){this.logger=a}var glob=require("glob"),logger=require("yocto-logger"),_=require("lodash"),Schema=require("mongoose").Schema,joi=require("joi"),utils=require("yocto-utils");Method.prototype.add=function(a,b,c){if(_.isString(b)&&_.isArray(c)&&!_.isEmpty(b)&&!_.isEmpty(c)&&_.isObject(a)&&a instanceof Schema){var d=glob.sync("*.js",{cwd:b,realpath:!0});if(d.length>0)return _.each(d,function(b){var d=require(b);_.each(c,function(b){var c=joi.object().keys({type:joi.string().required().empty().allow(["static","method"]),name:joi.string().required().empty()}),e=joi.validate(b,c);_.isNull(e.error)?_.has(d,b.name)&&_.isFunction(d[b.name])&&(this.logger.info(["[ Method.add ] - Method [",b.name,"] founded adding new","method"===b.type?"instance":b.type,"method for given schema"].join(" ")),a[b.type](b.name,function(a){return d[b.name](a)})):this.logger.error(["[ Method.add ] - Cannot add method for item ",utils.obj.inspect(b),e.error].join(" "))},this)},this),a;this.logger.warning(["[ Method.add ] - Given directory path for","Methods seems to be empty.","Cannot add method on schema."].join(" "))}else this.logger.error("[ Method.add ] - cannot process invalid path / name or schema given.");return!1},module.exports=function(a){return(_.isUndefined(a)||_.isNull(a))&&(logger.warning("[ Method.constructor ] - Invalid logger given. Use internal logger"),a=logger),new Method(a)};