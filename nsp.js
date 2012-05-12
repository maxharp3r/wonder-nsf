
var $ = require('jquery');
var keys = require('./keys.js'); // private
var ntwitter = require('ntwitter');

this.eventEmitter = null;
this.twit = null;

this.init = function(eventEmitter) {
	this.eventEmitter = eventEmitter;
	this.twit = new ntwitter({
		consumer_key: keys.twitter.consumer_key,
		consumer_secret: keys.twitter.consumer_secret,
		access_token_key: keys.twitter.access_token_key,
		access_token_secret: keys.twitter.access_token_secret
	});
};

this.test = function() {
	console.log("test received");
//	var self = this;
//	this.twit.verifyCredentials(function(err, data) {
//		self.eventEmitter.emit('test', data);
//	});


	var deferred = new $.Deferred();
	this.twit.verifyCredentials(function(err, data) {
		deferred.resolve(data);
	});
	return deferred.promise();
};

this.go = function() {
	console.log("go received");

	var deferred = new $.Deferred();
	this.twit.search('I wonder', function(err, data) {
		deferred.resolve(data);
	});
	return deferred.promise();
};


