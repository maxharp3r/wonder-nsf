
var express = require('express');
var app = express.createServer();
var redis = require("redis");
var io = require('socket.io').listen(app).set("log level", 1);
var $ = require('jquery');
var underscore = require("./static/lib/underscore-1.3.1-min");

var nsp = require('./nsp.js');


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

	socket.on("nextColor", function() {
		console.log("got color");
		var color = nsp.color();
		socket.emit("nextColor", color);
		console.log("emit " + color);
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

var iteration = 0;
setInterval(function() {
	var displayPosition = nsp.nextDisplayPosition();
	iteration++;

	if (iteration % 4 === 0) {
		// twitter
		$.when(nsp.nextTwitter()).done(function(data) {
			$.extend(data, displayPosition);
			io.sockets.in("all").emit("nextTwitter", data);
		});
	} else {
		// flickr
		$.when(nsp.nextFlickr()).done(function(data) {
			$.extend(data, displayPosition);
			io.sockets.in("all").emit("nextFlickr", data);
		});
	}
}, 2000);

