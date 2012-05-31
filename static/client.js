
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

	data: {
		twitter_result: null,
	},

	dom: {
		// controls
		test_link: $("a#test"),
		go_link: $("a#go"),
		next_link: $("a#next"),
		show_user_link: $("a#show-user"),
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
		this.dom.show_user_link.click(function() {
			self.dom.results.fadeOut(function() {
				self.dom.img.fadeIn();
			});
		});
		this.dom.show_photo_link.click(function() {
			self.socket.emit("photo");

			self.dom.img.hide();
			self.dom.resultsMain.text("loading photo...");
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
			self.data.twitter_result = data;

			self.dom.resultsMain.html(data.text);
			self.dom.resultsFooter.html("@" + data.from_user + "<br>" + $.timeago(data.created_at));

			// pre-load img
			var img = $("<img>", {
				src: self.data.twitter_result.profile_image_url,
				width: 960,
				height: 400,
			});
			self.dom.img.html(img);
		});
		this.socket.on('photo', function (data) {
			console.log("received photo", data);
			self.dom.results.text(data);

			// pre-load img
			var img = null;
			img = $("<img>", {
				src: data,
				width: 960,
				height: 400,
				load: function(foo) {
					self.dom.img.html(img);
					self.dom.results.hide();
					self.dom.img.show();
				},
			});
		});

	},
};

$(document).ready(function() {
	client.init();
});
