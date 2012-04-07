/*
 * send SGF file
 */

var fs = require("fs");
var url = require("url");

exports.send = function(req, res){

  console.log("Request handler 'send' was called.");
  //console.log('file: ' + req.params.file);
  
  var file = 'public/output.sgf';

  res.setHeader('Content-disposition', 'attachment; filename=file.sgf');
  res.setHeader('Content-type', 'application/x-go-sgf');

  var filestream = fs.createReadStream(file);
  filestream.on('data', function(chunk) {
    res.write(chunk);
  });
  filestream.on('end', function() {
    res.end();
  });

}