
var express = require('express');
var app = express.createServer();
var redis = require("redis");
var io = require('socket.io').listen(app).set("log level", 1);
var $ = require('jquery');
var underscore = require("./static/lib/underscore-1.3.1-min");

var nsp = require('./nsp.js');
var utils = require('./utils.js');


// app setup
app.configure(function() {
	app.use('/static', express.static(__dirname + '/static'));
});
app.listen(8080);
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/static/client.html');
});
app.error(function(err, req, res){
	console.error("APP ERROR: " + err);
});


// configure the db connection
var db = redis.createClient();
db.on("error", function (err) {
	console.error("REDIS ERROR (server): " + err);
});
// initialize application state
var appState = {
	numConnected: 0,
	socketsById: {}, // map id to websocket
};


// handle socket connections and messages
// docs: https://github.com/learnboost/socket.io
// TODO: how to configure socket.io to be resilient to exceptions?
io.sockets.on('connection', function (socket) {
	// console.log("connect", socket.id);

	socket.join('all');
	appState.numConnected++;
	appState.socketsById[socket.id] = socket;

	socket.on('disconnect', function () {
		// console.log("disconnect", socket.id);
		appState.numConnected--;
		delete appState.socketsById[socket.id];
	});

	socket.on("test", function() {
		$.when(nsp.test()).done(function(data) {
			socket.emit("test", data);
		});
	});

	socket.on("searchTwitter", function() {
		$.when(nsp.searchTwitter()).done(function(data) {
			console.log("found twitter data");
			// socket.broadcast.emit("twitter", data);
			socket.broadcast.to("all").emit("twitterSearchComplete", data);
		});
	});

	socket.on("nextTwitter", function() {
		var displayPosition = nsp.nextDisplayPosition();
		$.when(nsp.nextTwitter()).done(function(data) {
			$.extend(data, displayPosition);
			socket.emit("nextTwitter", data);
			// socket.broadcast.emit("twitter_result", data);
			// socket.broadcast.to("all").emit("twitter_result", data);
			// console.log("NEXT", data);
			// io.sockets.in("all").emit("twitter_result", data);
		});
	});

	socket.on("nextFlickr", function() {
		var displayPosition = nsp.nextDisplayPosition();
		$.when(nsp.nextFlickr()).done(function(data) {
			$.extend(data, displayPosition);
			socket.emit("nextFlickr", data);
		});
	});

});


// handle server-side events
db.on("message", function (channel, data) {
	console.log("redis channel " + channel + ": " + data);
	// io.sockets.in("all").emit("test", data);
});
db.subscribe("nsp:event_stream");


// run
nsp.init();

// push text to the client
var pushText = function(displayPosition) {
	// first, check for priority messages
	$.when(nsp.nextPriorityTwitter())
		.done(function(data) {
			$.extend(data, displayPosition, {extra: "Northern Spark"});
			io.sockets.in("all").emit("nextTwitter", data);
		}).fail(function() {
			$.when(nsp.nextTwitter()).done(function(data) {
				$.extend(data, displayPosition);
				io.sockets.in("all").emit("nextTwitter", data);
			});
		});
};

// push an image to the client
var pushImg = function(displayPosition) {
	$.when(nsp.nextFlickr()).done(function(data) {
		$.extend(data, displayPosition);
		io.sockets.in("all").emit("nextFlickr", data);
	});
};

// periodically find content and push to displays
setInterval(function() {

	// message or photo?
	var showMsg = utils.getRandomInt(0, 99) < 40;

	// show multiple at once?
	var numToShow = 1;
	var r1 = utils.getRandomInt(0, 99);
	if (r1 < 10) {
		numToShow = 3;
	} else if (r1 < 20) {
		numToShow = 2;
	} else if (r1 > 95) {
		numToShow = 0;
	}

	// show one or more things
	underscore(numToShow).times(function() {
		var displayPosition = nsp.nextDisplayPosition();
		if (showMsg === true) {
			pushText(displayPosition);
		} else {
			pushImg(displayPosition);
		};
	});
}, 3500);

