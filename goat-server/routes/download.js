
/*
 * Display link to download SGF file
 */

var fs = require("fs");
var url = require("url");

exports.download = function(req, res){
  //var results = url.parse(req).query;
  console.log("Request handler 'download' was called.");
  // what about rendering a preview image of the SGF here?
  res.render('download', { title: 'Download SGF' })  

}