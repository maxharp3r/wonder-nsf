
var utils = {

	// from http://webcloud.se/log/JavaScript-and-ISO-8601/
	dateToIsoString: function(d) {
		function pad(n) {
			return n < 10 ? '0'+n : n;
		};
		return d.getUTCFullYear()+'-'
			+ pad(d.getUTCMonth()+1)+'-'
			+ pad(d.getUTCDate())+'T'
			+ pad(d.getUTCHours())+':'
			+ pad(d.getUTCMinutes())+':'
			+ pad(d.getUTCSeconds())+'Z';
	},

	twitterDateToIso: function(twitterDate) {
		var d = $.timeago.parse(twitterDate);
		return this.dateToIsoString(d);
	},
};

var client = {
	socket: null,

	dom: {
		// general
		body: $("body"),

		// controls
		test_link: $("a#test"),
		go_link: $("a#go"),
		next_link: $("a#next"),
		show_photo_link: $("a#show-photo"),

		// display
		results: $("div#results"),
		resultsMain: $(".main", this.results),
		resultsFooter: $(".footer", this.results),
		img: $("div#img"),
	},

	init: function() {
		var self = this;
		this.dom.test_link.click(function() {
			self.socket.emit("test");
			self.dom.resultsMain.text("waiting for twitter...");
		});
		this.dom.go_link.click(function() {
			self.socket.emit("go");
			self.dom.resultsMain.text("searching...");
		});
		this.dom.next_link.click(function() {
			self.dom.img.hide();
			self.dom.results.show();

			self.socket.emit("next");
			self.dom.resultsMain.text("next...");
		});
		this.dom.show_photo_link.click(function() {
			self.socket.emit("photo");
		});
		this.listen();
	},

	listen: function() {
		var self = this;
		this.socket = io.connect('http://localhost:8080');
		this.socket.on('test', function (data) {
			console.log("received test", data);
			self.dom.resultsMain.text("twitter says my username is: " + data.screen_name);
		});
		this.socket.on('twitter', function (data) {
			console.log("received twitter", data);
			self.dom.resultsMain.text("got " + data + " results");
		});
		this.socket.on('twitter_result', function (data) {
			console.log("received twitter msg", data);
			self.dom.resultsMain.html(data.text);
			self.dom.resultsFooter.html("@" + data.from_user
					+ "<br>" + $.timeago(data.created_at)
					+ "<br>" + data.words);
		});
		this.socket.on('photo', function (photoUrl) {
			$.backstretch(photoUrl, {speed: 500});
		});

	},
};

$(document).ready(function() {
	client.init();
});
