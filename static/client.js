
var SERVER_URL = 'http://localhost:8080';
//var SERVER_URL = 'http://192.168.11.207:8080';

var FADE_TIME = 500;

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

// underscore templates
var tmpl = {
	results: "\
		<div class='tmpl results'>\
			<div class='main big-text'><%= data.text %></div>\
			<div class='footer small-text'>\
				<div><%= data.from_user %></div>\
				<div><%= $.timeago(data.created_at) %></div>\
				<div><%= data.words %></div>\
			</div>\
		</div>\
	",

	word: "\
		<div class='tmpl word big-text'>\
			<div><%= word %></div>\
		</div>\
	",
};

var client = {
	socket: null,

	dom: {
		// general
		html: $("html"),
		body: $("body"),

		// controls
		test_link: $("a#test"),
		go_link: $("a#go"),
		next_msg_link: $("a#next-msg"),
		next_photo_link: $("a#next-photo"),
		next_color_link: $("a#next-color"),

		// display
		content: $("div#content"),
		results: $("div.results"),
		resultsMain: $(".main", this.results),
		resultsFooter: $(".footer", this.results),
		word: $("div#word", this.content),
	},

	init: function() {
		var self = this;
		this.dom.test_link.click(function() {
			self.socket.emit("test");
		});
		this.dom.go_link.click(function() {
			self.socket.emit("searchTwitter");
		});
		this.dom.next_msg_link.click(function() {
			self.socket.emit("nextTwitter");
		});
		this.dom.next_photo_link.click(function() {
			self.socket.emit("nextFlickr");
		});
		this.dom.next_color_link.click(function() {
			self.socket.emit("nextColor");
		});
		this.listen();
	},

	listen: function() {
		var self = this;
		this.socket = io.connect(SERVER_URL);
		this.socket.on('test', function (data) {
			self.dom.resultsMain.text("twitter says my username is: " + data.screen_name);
		});
		this.socket.on('twitterSearchComplete', function (data) {
			self.dom.resultsMain.text("got " + data + " results");
		});
		this.socket.on('nextTwitter', function (data) {
			self.clearPhoto();

			var output = _.template(tmpl.results, {data: data,});
			$("#one").html(output);
			$("#one .tmpl").fadeIn(FADE_TIME);
		});
		this.socket.on('nextFlickr', function (photoData) {
			self.clearText();
			if (photoData === null) {
				console.log("null photoData");
				return;
			}
			console.log("next flickr: ", photoData.word, photoData.url);

			// var baseEl = $("#two");
			var output = _.template(tmpl.word, {word: photoData.word});
			$("#two").html(output);
			$("#two .tmpl").fadeIn(FADE_TIME);

			$('#backstretch').fadeIn(FADE_TIME);
			$.backstretch(photoData['url'], {
				target: "#two",
				speed: FADE_TIME,
				positionType: "relative",
				zIndex: 10,
			});
			self.dom.word.text(photoData['word']).fadeIn(FADE_TIME);
		});
		this.socket.on('nextColor', function (color) {
			self.clearText();
			self.clearPhoto();
			self.dom.html.animate({ backgroundColor: color }, FADE_TIME);
		});
	},

	clearText: function() {
		this.dom.results.fadeOut(FADE_TIME);
	},

	clearPhoto: function() {
		this.dom.word.fadeOut(FADE_TIME);
		$('#backstretch').fadeOut(FADE_TIME, function() {
			$.backstretch("/static/transparent.png");
		});
	},
};

$(document).ready(function() {
	client.init();
});
