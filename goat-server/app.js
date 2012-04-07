
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  ,	analyze = require('./routes/analyze')
  , download = require('./routes/download')
  , send = require('./routes/send');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(express.logger());
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', routes.index);
app.post('/analyze', analyze.analyze);
app.get('/download', download.download);
app.get('/send/:file', send.send);

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
