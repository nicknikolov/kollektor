var express = require('express');
var routes = require('./routes');
var fs = require('fs');
var persist = require('persist');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

//Settings

var SERVER_PORT = 3000;

var DB_CONFIG = {
  'driver': 'sqlite3',
  'filename': 'content/kollektor.sqlite',
  'defautFilename': 'content/kollektor.sqlite.default'
};

// DB Configuration

persist.setDefaultConnectOptions(DB_CONFIG);

if (!fs.existsSync(__dirname + '/content/images')) {
  fs.mkdir(__dirname + '/content/images');
}

//check if DB exists and create new one if it doesn't
if (!fs.existsSync(DB_CONFIG.filename)) {
  fs.createReadStream(__dirname + '/' + DB_CONFIG.defautFilename).pipe(fs.createWriteStream(__dirname + '/' + DB_CONFIG.filename));
}

// App Configuration

var app = module.exports = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', { layout: false, pretty: true });
app.use(express.static(__dirname + '/public'));

app.get('/', routes.index);
app.get('/tag/*', routes.index);
app.get('/complexity/*', routes.index);
app.get('/s/*', routes.index);
app.get('/bookmarklet', routes.bookmarklet);
app.get('/api/get/*', routes.api.get);
app.get('/api/post', routes.api.post);
app.get('/api/update', routes.api.update);
app.post('/api/upload', multipartMiddleware, routes.api.upload);
app.get('/api/delete', routes.api.delete);
app.get('/api/tags', routes.api.tags);
app.get('/api/latest', routes.api.latest);
app.get('/tags', routes.tags);
app.get('/images/*', routes.images);
app.get('/js/config.js', function(req, res) {
  res.send('var inspiration_server = "http://localhost:'+SERVER_PORT+'"; var inspiration_tags = ""');
})

app.listen(SERVER_PORT, function(){
  console.log("Express server listening on port %d in %s mode", SERVER_PORT, app.settings.env);
});
