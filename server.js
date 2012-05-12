
// lib
var express = require('express');
var app = express.createServer();
var io = require('socket.io').listen(app).set("log level", 1);
var $ = require('jquery');
// var _und = require("./underscore-min")

// local
var nsp = require('./nsp.js');
nsp.init();

app.configure(function() {
	app.use('/static', express.static(__dirname + '/static'));
});

app.listen(8080);
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/client.html');
});

var appState = {
	numConnected: 0,
	connectedClients: {}, // map id to websocket
};


// handle sockets
io.sockets.on('connection', function (socket) {

	appState.numConnected++;
	appState.connectedClients[socket.id] = socket;
	// console.log("Connection:", socket.id);
	// console.log("Num connected clients:", appState.numConnected);

	socket.on('disconnect', function () {
		appState.numConnected--;
		// console.log("Disconnect:", socket.id);
		delete appState.connectedClients[socket.id];
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



