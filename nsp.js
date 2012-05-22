
var $ = require('jquery');
var ntwitter = require('ntwitter');
var redis = require("redis");
var underscore = require("./static/lib/underscore-1.3.1-min");

var keys = require('./keys.js'); // private

this.db = null;
this.nTwitterApi = null;



this.data = {
	result_idx: 0,
	results: [],

	// for testing
	photo_idx: 0,
	photos: [
		"http://farm6.staticflickr.com/5449/7193512948_324214f54a.jpg",
		"http://farm8.staticflickr.com/7072/7193515044_1cca6a1aa8.jpg",
		"http://farm8.staticflickr.com/7073/7193548928_eb650714e0.jpg",
		"http://farm8.staticflickr.com/7074/7193525262_d1a1c25745.jpg",
		"http://farm8.staticflickr.com/7081/7193525710_764767d99b.jpg",
		"http://farm9.staticflickr.com/8147/7193557318_459a203d02.jpg",
		"http://farm8.staticflickr.com/7216/7193553084_d66a82baf9.jpg",
		"http://farm9.staticflickr.com/8158/7193501630_fc49b8eb88.jpg",
		"http://farm9.staticflickr.com/8146/7193499524_0ae85367c1.jpg",
		"http://farm8.staticflickr.com/7098/7193477844_8e9e4487a1.jpg",
		"http://farm8.staticflickr.com/7213/7193497660_87ab659530.jpg",
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
};

this.test = function() {
	console.log("test received");

	this.db.publish("event_stream", "I am sending a message.");

	var deferred = new $.Deferred();
	this.nTwitterApi.verifyCredentials(function(err, data) {
		deferred.resolve(data);
	});
	return deferred.promise();
};

this.go = function() {
	var self = this;

	// https://github.com/AvianFlu/ntwitter
	// https://dev.twitter.com/docs/api/1/get/search
	// https://dev.twitter.com/docs/using-search
	console.log("go received");
	var deferred = new $.Deferred();

	var searchString = encodeURIComponent('"I wonder"');
	console.log("search for ", searchString);
	this.nTwitterApi.search(searchString, {rpp: 100}, function(err, data) {
		underscore.each(data.results, function(result) {
			if (result.text.substr(0,8) === "I wonder") {
				self.data.results.push(result);
			}
		});

		deferred.resolve(self.data.results.length);
	});

	return deferred.promise();
};

this.next = function() {
	return this.data.results[this.data.result_idx++];
};

this.photo = function() {
	return this.data.photos[this.data.photo_idx++];
};



/*
 *
 * TODO
 */
/*
// http://www.flickr.com/services/api/
// http://www.flickr.com/services/api/misc.urls.html
var FlickrAPI= require('flickrnode').FlickrAPI;
var flickr= new FlickrAPI(keys.flickr.key, keys.flickr.secret);

// Search for photos with a tag of 'badgers'
flickr.photos.search({tags:'beach'},  function(error, results) {

	console.log(results);

	underscore.each(results.photo, function(result) {
		var url = "http://farm" + result.farm +
			".staticflickr.com/" + result.server +
			"/" + result.id +
			"_" + result.secret +
			".jpg";
		console.log(url);
	});
});
*/