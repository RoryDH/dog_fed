var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var feedStore = "feed_store.json";
var maxToSendBack = 11;
try {
	// Get user config file
  var uc = require(__dirname + '/config.json');
  console.log('Loading Config');
} catch(e) {
  console.log('Cannot read/find config.json file, using defaults');
  process.exit();
}
console.log("Config:", uc);

fs.readFile(feedStore, 'utf8', function (err, fileContents) {
	if (err) {
		fs.writeFile(feedStore, JSON.stringify({feeds: []}), function (err) {
		  if (err) throw err;
		});
	}
});

var app = express();

// setup web server
app.set('port', process.env.PORT || 3643);
app.use(express.basicAuth(uc.username, uc.password));
app.use(express.favicon());
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// feeds: [{feedTime: timestring, note: string}]

function getCurrentFeedObject() {
	var timestamp = new Date;
	fileContents = fs.readFileSync(feedStore, 'utf8');
	fileObj = JSON.parse(fileContents);
	fileObj.timeNow = timestamp.toString();
	fileObj.dogName = uc.dogName;
	return fileObj;
}

function reduceFeedList(feedObj) {
	feedObj.feeds = feedObj.feeds.slice(0, maxToSendBack);
	return feedObj;
}

app.get('/', function(req, res){
	res.sendfile(__dirname + "/public/index.html");
});

app.post('/feed.json', function(req, res){
	var timestamp = new Date;
	var feedObj = getCurrentFeedObject();
	var note = req.body.note;
	feedObj.feeds.unshift({note: note, feedTime: timestamp.toString()});
	fs.writeFile(feedStore, JSON.stringify({feeds: feedObj.feeds}), function (err) {
	  if (err) {
	  	res.json({error: "file write error"});
	  	throw err;
	  } else {
	  	res.json(reduceFeedList(feedObj));
	  }
	});
});

app.get('/feeds.json', function(req, res){
	var timestamp = new Date;
	res.json(reduceFeedList(getCurrentFeedObject()));
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
