
var $ = require('jquery');
var ntwitter = require('ntwitter');
var flickrnode = require('flickrnode').FlickrAPI;
var redis = require("redis");
var underscore = require("./static/lib/underscore-1.3.1-min");

var keys = require('./keys.js'); // private
var utils = require('./utils.js');


var NUM_PANELS = 3;
var NUM_SCREENS = 3;
var CHECK_TWITTER_HEALTH_MS = 10 * 1000; // check the state of the tracker every n millis
var RATE_LIMIT_MS = 2 * 1000; // no more than 1 message every n millis

var TWITTER_STREAM_REGEX = /(^I wonder|^I think)/;
var NSPK_REGEX = /(northern.spark|#nspk)/i;
// var NSPK_REGEX = /(when)/i;


this.db = null;
this.nTwitterApi = null;

// application state
this.data = {
	// twitter api
	isRunning: false, // twitter stream status
	acceptMsg: false, // rate limit

	// twitter messages
	result_idx: 0,
	results: [],

	// photos
	photo_words_score: 0,
	photo_current_word: "",
	photo_idx: 0,
	photos: [],

	// background colors
	color_idx: 0,
	colors: [
		"#000",
		"#900", // red
		"#990", // yellow
	],
};

this.init = function() {
	var self = this;

	// db client
	var db = redis.createClient();
	db.on("error", function (err) {
		console.error("REDIS ERROR (server): " + err);
	});
	this.db = db;

	// new twitter api
	this.nTwitterApi = new ntwitter({
		consumer_key: keys.twitter.consumer_key,
		consumer_secret: keys.twitter.consumer_secret,
		access_token_key: keys.twitter.access_token_key,
		access_token_secret: keys.twitter.access_token_secret,
	});

	// flickr api
	// http://www.flickr.com/services/api/
	// http://www.flickr.com/services/api/misc.urls.html
	this.flickrApi = new flickrnode(keys.flickr.key, keys.flickr.secret);

	// kick-off the twitter tracker process
	this.initTwitterStream();
	// check health of twitter tracker
	setInterval(function() {
		if (self.data.isRunning !== true) {
			console.log("TWITTER SEARCH DIED!");
			self.initTwitterStream();
		} else {
			console.log("twitter tracker still running");
		}
	}, CHECK_TWITTER_HEALTH_MS);
	setInterval(function() {
		self.data.acceptMsg = true;
	}, RATE_LIMIT_MS);
};

this.test = function() {
	console.log("test received");

	var self = this;
	var deferred = new $.Deferred();
	this.nTwitterApi.verifyCredentials(function(err, data) {
		self.db.publish("nsp:event_stream", JSON.stringify(data));
		deferred.resolve(data);
	});
	return deferred.promise();
};

/**
 * Handler for a tweet that we want to store in the db for display.
 */
this.handleTweet = function(tweet, dbPrefix) {
	var self = this;

	// get the interesting words
	var words = tweet.text.substr(8).split(/[^a-zA-Z]/);
	underscore.each(words, function(word) {
		if (word.length > 2) {
			word = word.toLowerCase();
			self.db.zscore("nsp:words", word, function(err, res) {
				if (err) {
					return;
				}

				if (res > 1000) {
					var key = dbPrefix + ":" + tweet.id + ":words";
					self.db.zadd(key, res, word);
					self.db.expire(key, 36000); // 10 hours
				}
			});
		}
	});

	// lpush message - newest <==> oldest
	self.db.lpush(dbPrefix, JSON.stringify(tweet));
	self.db.ltrim(dbPrefix, 0, 99); // keep the leftmost (newest) 100 messages
};

/**
 * Start listening to the twitter stream.
 */
this.initTwitterStream = function() {
	var self = this;
	console.log("Initializing twitter stream");
	this.data.isRunning = true;

	// https://dev.twitter.com/docs/api/1/post/statuses/filter
	this.nTwitterApi.stream('statuses/filter', {track:'I wonder,I think'}, function(stream) {
		stream.on('data', function (data) {
			if (data.text.match(TWITTER_STREAM_REGEX)) {
				if (data.text.match(NSPK_REGEX)) {
					console.log("NSP! =================================");
					console.log("stored nsp msg: ", data.created_at, data.text.substring(0,80));
					self.handleTweet(data, "nsp:twitter:nsp:msg");
				} else if (self.data.acceptMsg === true) {
					console.log("stored msg: ", data.created_at, data.text.substring(0,80));
					self.handleTweet(data, "nsp:twitter:msg");
				}
				self.data.acceptMsg = false;
			}
		});
		stream.on('error', function (error) {
			// Handle a programming (?) error
			console.log("TWITTER ERROR", error);
			self.data.isRunning = false;
		});
		stream.on('end', function (response) {
			// Handle a disconnection
			console.log("TWITTER END");
			self.data.isRunning = false;
		});
		stream.on('destroy', function (response) {
			// Handle a 'silent' disconnection from Twitter, no end/error event fired
			console.log("TWITTER DESTROY");
			self.data.isRunning = false;
		});
	});
};

/**
 * Manually run a twitter search.
 *
 * Unused except when requested by the client explicitly.
 */
this.searchTwitter = function() {
	var self = this;

	console.log("searchTwitter received");
	var deferred = new $.Deferred();

	var searchString = encodeURIComponent('"I wonder"');
	console.log("search for ", searchString);
	this.nTwitterApi.search(searchString, {rpp: 100}, function(err, data) {
		found = 0;
		underscore.chain(data.results)
			.filter(function(result) {
				// only want tweets that /start with/ I wonder
				return result.text.substr(0,8) === "I wonder";
			})
			// .reverse() // reverse the default order - we want old to new
			.each(function(result) {
				found++;
				self.handleTweet(data, "nsp:twitter:msg");
		});
		console.log("twitter search for I wonder found " + found + " messages.");

		// return the current length of the queue
		self.db.llen("nsp:twitter:msg", function (err, res) {
			deferred.resolve(res);
		});

	});

	return deferred.promise();
};

/**
 * Run a flickr search for a tag.
 */
this.searchFlickr = function(tag, score) {
	var self = this;

	var searchOpts = {
		tags: tag,
		//sort: "interestingness-desc",
		//sort: "date-posted-desc",
		sort: "relevance",
	};
	this.flickrApi.photos.search(searchOpts,  function(error, results) {
		if (error || !results) {
			console.warn("Flickr search for " + tag + " failed.");
			return;
		}

		self.data.photo_words_score = score;
		self.data.photo_current_word = tag;
		self.data.photo_idx = 0;

		self.data.photos = [];
		console.log("Flickr search for " + tag + " found " + results.photo.length + " photos.");
		underscore.each(results.photo, function(result) {
			var url = "http://farm" + result.farm +
				".staticflickr.com/" + result.server +
				"/" + result.id +
				"_" + result.secret +
				".jpg";
			self.data.photos.push(url);
		});
	});
};

this._nextTwitter = function(dbPrefix) {
	var self = this;
	var deferred = new $.Deferred();

	// rpop message (oldest message)
	this.db.rpop(dbPrefix, function(err, res) {
		if (res == null) {
			return;
		}
		var result = JSON.parse(res);
		result.words = [];

		// look for the scored words
		var key = dbPrefix + ":" + result.id + ":words";
		self.db.zrevrange(key, 0, -1, "WITHSCORES", function(err, words) {
			if (words.length > 2) {
				var score = parseInt(words[1]) + parseInt(words[3]);
				self.searchFlickr(words[0] + "," + words[2], score);
			} else if (words.length > 0) {
				var score = parseInt(words[1]);
				self.searchFlickr(words[0], score);
			} else {
				// do nothing
				// self.data.photo_current_word = null;
			}

			while (!underscore.isEmpty(words)) {
				var score = words.pop();
				var word = words.pop();

				var msg = word + " (" + score + ")";
				result.words.push(msg);
			}
			deferred.resolve(result);
		});
	});
	return deferred;
};
this.nextNspTwitter = function() { return this._nextTwitter("nsp:twitter:nsp:msg"); };
this.nextTwitter = function() { return this._nextTwitter("nsp:twitter:msg"); };


/**
 * Get the next photo.
 */
this.nextFlickr = function() {
	if (this.data.photos.length === 0 || this.data.photo_current_word === null) {
		return;
	}

	// random
	var idx = utils.getRandomInt(0, this.data.photos.length - 1);

	// in order
	//var idx = this.data.photo_idx++;

	return {
		url: this.data.photos[idx],
		word: this.data.photo_current_word,
	};
};

/**
 * Get the next background color.
 */
this.color = function() {
	this.data.color_idx = ((this.data.color_idx + 1) % this.data.colors.length);
	return this.data.colors[this.data.color_idx];
};

/**
 * Get the next panel for display.
 */
this.nextDisplayPosition = function() {
	var screen = utils.getRandomInt(0, NUM_SCREENS-1) + 1;
	var panel = utils.getRandomInt(0, NUM_PANELS-1);
	return {displayScreen: screen, displayPanel: panel};
};
