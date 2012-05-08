
var express = require('express');
var app = express.createServer();
var io = require('socket.io').listen(app);
var twitter = require('ntwitter');
// var _und = require("./underscore-min")

app.configure(function() {
    app.use('/static', express.static(__dirname + '/static'));
});

app.listen(8080);
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/foo.html');
});

var twit = new twitter({
	/* TODO */
});

var searchResults = undefined;


var connectedClients = {}; // map id to websocket

// handle sockets
io.sockets.on('connection', function (socket) {

	console.log("Connection:", socket.id);
	connectedClients[socket.id] = socket;

	socket.on('disconnect', function () {
		console.log("Disconnect:", socket.id);
		delete connectedClients[socket.id];
	});

	socket.on("test", function() {
		console.log("test received");
		twit.verifyCredentials(function(err, data) {
		    socket.emit("test", data);
		});
	});

	socket.on("go", function() {
		console.log("go received");
		twit.search('I wonder', function(err, data) {
			console.log("twitter search returned");
			socket.emit("twitter", data);
		});
	});

});



