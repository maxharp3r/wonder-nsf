
var express = require('express');
var app = express.createServer();
var redis = require("redis");
var io = require('socket.io').listen(app).set("log level", 1);
var $ = require('jquery');
var underscore = require("./static/lib/underscore-1.3.3-min");
var request = require('request');
var fs = require('fs');

var config = require('./config.js').config;
var nsp = require('./nsp.js');
var utils = require('./utils.js');


// app setup
app.configure(function() {
	app.use('/static', express.static(__dirname + '/static'));
	app.use('/images', express.static(__dirname + '/images'));
});
app.listen(config.app.LISTEN_PORT);
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
var pubsub = redis.createClient();
pubsub.on("error", function (err) {
	console.error("REDIS ERROR (server): " + err);
});
pubsub.on("message", function (channel, data) {
	console.log("redis channel " + channel + ": " + data);
	// io.sockets.in("all").emit("test", data);
});
pubsub.subscribe(config.dbkey.EVENT_STREAM);


// emit and/or save data for replay.
var handleData = function(event, data) {
	if (!data) {
		log.warn("Missing or empty data for event " + event);
		return;
	}
	console.log("outgoing data: " + event);

	if (config.app.DO_SAVE_FOR_REPLAY && !config.app.DO_EMIT_FROM_REPLAY) {
		$.extend(data, {event: event});
		// console.log("saving data: " + JSON.stringify(data));
		db.rpush(config.dbkey.RECORDED, JSON.stringify(data));
	}

	if (config.app.DO_EMIT_FROM_REPLAY) {
		$.extend(data, {recorded: true});
	}

	if (config.app.DO_EMIT || config.app.DO_EMIT_FROM_REPLAY) {
		io.sockets.in("all").emit(event, data);
	};
};

// emit or save a twitter message. ensure that high-priority messages are shown.
var handleText = function(displayPosition) {
	// first, check for priority messages
	$.when(nsp.nextPriorityTwitter())
		.done(function(data) {
			$.extend(data, displayPosition, {extra: config.search.PRIORITY_LABEL});
			handleData("nextTwitter", data);
		}).fail(function() {
			$.when(nsp.nextTwitter()).done(function(data) {
				$.extend(data, displayPosition);
				handleData("nextTwitter", data);
			});
		});
};

// emit or save an image. if saving, initiate a download and store the local link.
var handleImg = function(displayPosition) {
	$.when(nsp.nextFlickr()).done(function(data) {
		// nextFlickr always returns success, so check for data
		if (!data) {
			return;
		}

		$.extend(data, displayPosition);

		if (config.app.DO_SAVE_FOR_REPLAY) {
			// add a second url for use in replays
			$.extend(data, {local_url: "/images/" + data.filename});

			// kick off an image download
			console.log("downloading " + data.url);
			var path = config.app.IMAGES_PATH + data.filename;
			request(data.url).pipe(fs.createWriteStream(path));
		}

		handleData("nextFlickr", data);
	});
};

var getNumToShow = function() {
	var numToShow = 1;
	var r1 = utils.getRandomInt(0, 99);
	if (r1 < 10) {
		numToShow = 3;
	} else if (r1 < 20) {
		numToShow = 2;
	} else if (r1 > 95) {
		numToShow = 0;
	}
	return numToShow;
}

//emit a replay event
var nextReplay = function() {
	underscore(getNumToShow()).times(function() {
		db.lpop(config.dbkey.RECORDED, function(err, res) {
			if (res === null) {
				console.log("Uh oh.");
				throw("No more recorded content. Exiting.");
			}

			var data = JSON.parse(res);
			handleData(data.event, data);
		});
	});
}

// periodically emit or save
var nextEvent = function() {
	// message or photo?
	var showMsg = utils.getRandomInt(0, 99) < 40;

	// show one or more things
	underscore(getNumToShow()).times(function() {
		var displayPosition = nsp.nextDisplayPosition();
		if (showMsg === true) {
			handleText(displayPosition);
		} else {
			handleImg(displayPosition);
		};
	});
}

var run = function() {
	if (config.app.DO_EMIT_FROM_REPLAY) {
		setInterval(nextReplay, config.app.NEXT_EVENT_INTERVAL_MS);
	} else {
		nsp.init();
		setInterval(nextEvent, config.app.NEXT_EVENT_INTERVAL_MS);
	}
}
run();

