
var $ = require('jquery');
var ntwitter = require('ntwitter');
var flickrnode = require('flickrnode').FlickrAPI;
var redis = require("redis");
var underscore = require("./static/lib/underscore-1.3.1-min");

var keys = require('./keys.js'); // private
var utils = require('./utils.js');

this.db = null;
this.nTwitterApi = null;


this.data = {
	// twitter messages
	result_idx: 0,
	results: [],

	// photos
	photo_current_word: "",
	photo_idx: 0,
	photos: [],

	// background colors
	color_idx: 0,
	colors: [
		"#000",
		"#900", // red
	],
};

this.init = function() {
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
		access_token_secret: keys.twitter.access_token_secret
	});

	// flickr api
	// http://www.flickr.com/services/api/
	// http://www.flickr.com/services/api/misc.urls.html
	this.flickrApi = new flickrnode(keys.flickr.key, keys.flickr.secret);
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

this.go = function() {
	var self = this;

	console.log("go received");
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
			.reverse() // reverse the default order - we want old to new
			.each(function(result) {
				found++;

				// get the interesting words
				var words = result.text.substr(8).split(/[^a-zA-Z]/);
				underscore.each(words, function(word) {
					if (word.length > 2) {
						word = word.toLowerCase();
						self.db.zscore("nsp:words", word, function(err, res) {
							if (err) {
								return;
							}

							if (res > 1000) {
								var key = "nsp:twitter:msg:" + result.id + ":words";
								self.db.zadd(key, res, word);
								self.db.expire(key, 36000); // 10 hours
							}
						});
					}
				});

				// rpush message - oldest <==> newest
				self.db.rpush("nsp:twitter:msg", JSON.stringify(result));
				self.db.ltrim("nsp:twitter:msg", 0, 99); // keep up to 100 messages
		});
		console.log("twitter search for I wonder found " + found + " messages.");

		// return the current length of the queue
		self.db.llen("nsp:twitter:msg", function (err, res) {
			deferred.resolve(res);
		});

	});

	return deferred.promise();
};

this.next = function() {
	var self = this;
	var deferred = new $.Deferred();

	// lpop message (oldest message)
	this.db.lpop("nsp:twitter:msg", function(err, res) {
		var result = JSON.parse(res);
		result.words = [];

		// look for the scored words
		var key = "nsp:twitter:msg:" + result.id + ":words";
		self.db.zrevrange(key, 0, -1, "WITHSCORES", function(err, words) {
			if (words.length > 0) {
				self.goFlickr(words[0]);
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

/**
 * Get the next photo.
 */
this.photo = function() {
	if (this.data.photos.length === 0) {
		return;
	}

	var idx = utils.getRandomInt(0, this.data.photos.length - 1);
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
 * Run a flickr search for a tag.
 */
this.goFlickr = function(tag) {
	var self = this;

	var searchOpts = {
		tags: tag,
		//sort: "interestingness-desc",
		//sort: "date-posted-desc",
		sort: "relevance",
	};
	this.flickrApi.photos.search(searchOpts,  function(error, results) {
		self.data.photo_current_word = tag;
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
