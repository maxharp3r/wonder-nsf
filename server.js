
var events = require('events');

var express = require('express');
var app = express.createServer();
var io = require('socket.io').listen(app).set("log level", 1);
var $ = require('jquery');
var underscore = require("./static/underscore-1.3.1-min");

var nsp = require('./nsp.js');

app.configure(function() {
	app.use('/static', express.static(__dirname + '/static'));
});

app.listen(8080);
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/client.html');
});
// TODO: how to configure node/express to be resilient to exceptions?

// initialize application state
var eventEmitter = new events.EventEmitter();
var appState = {
	numConnected: 0,
	socketsById: {}, // map id to websocket
};
nsp.init(eventEmitter);

// handle socket connections and messages
// docs: https://github.com/learnboost/socket.io
io.sockets.on('connection', function (socket) {
	console.log("connect", socket.id);

	appState.numConnected++;
	appState.socketsById[socket.id] = socket;

	socket.on('disconnect', function () {
		console.log("disconnect", socket.id);
		appState.numConnected--;
		delete appState.socketsById[socket.id];
	});

	socket.on("test", function() {
		$.when(nsp.test()).done(function(data) {
			socket.emit("test", data);
		});
	});

	socket.on("go", function() {
		$.when(nsp.go()).done(function(data) {
			socket.emit("twitter", data);
		});
	});

});

// handle server-side events
eventEmitter.on('test', function (data) {
	var sockets = underscore.values(appState.socketsById);
	underscore.each(sockets, function(socket) {
		socket.emit("test", data);
	});
});




