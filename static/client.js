
var SERVER_URL = 'http://localhost:8080';
//var SERVER_URL = 'http://192.168.11.207:8080';

var FADE_TIME = 500;

// underscore templates
var tmpl = {
	results: "\
		<div class='tmpl results'>\
			<div class='main big-text'><%= data.text %></div>\
			<div class='footer small-text'>\
				<div>@<%= data.user.screen_name %></div>\
				<div class='<%= data.created_class %>'><%= $.timeago(data.created_at) %></div>\
				<div class='extra'><%= data.extra %></div>\
			</div>\
		</div>\
	",
	//<div><%= data.words %></div>\

	word: "\
		<div class='tmpl word big-text'>\
			<div><%= word %></div>\
		</div>\
	",
};

var client = {
	id: null,
	socket: null,

	dom: {
		// general
		html: $("html"),
		body: $("body"),

		// header
		test_link: $("a#test"),
		go_link: $("a#go"),
		next_msg_link: $("a#next-msg"),
		next_photo_link: $("a#next-photo"),
		screen_id: $("#screen-id"),

		// display
		panels: [
			"#one",
			"#two",
			"#three",
		],
		getPanelId: function(idx) { return this.panels[idx];},
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
		this.listen();

		// set this screen's id from the URL's #hash
		this.id = $.param.fragment();
		console.log("Client has ID==", this.id);
		if (!this.id) {
			console.warn("Please set an id by using #id (e.g., #1, #2, or #3)");
		}
		this.dom.screen_id.text(this.id);
	},

	/** return true if this socket message is explictly for this screen */
	isMsgForMe: function(data, debug_type) {
		// always return true, we only have one screen
		return true;

//		if (!data || !data.displayScreen) {
//			return false;
//		}
//		var ret = this.id.indexOf(data.displayScreen) >= 0;
//		console.debug("Data: " + debug_type + " (isFormMe=" + ret + ", screen="
//			+ data.displayScreen + ", panel=" + data.displayPanel + ")");
//		return ret;
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
			if (!self.isMsgForMe(data, "twitter")) { return; }

			self.clearPhoto();
			// console.log("next twitter: ", data);

			// clean up the data
			if (!data.extra) {
				data.extra = "";
			}
			data.created_class = (data.recorded) ? "hidden" : "";

			var baseId = self.dom.getPanelId(data.displayPanel);
			var output = _.template(tmpl.results, {data: data});
			$(baseId).html(output);
			$(baseId + " .tmpl").fadeIn(FADE_TIME);
		});
		this.socket.on('nextFlickr', function (data) {
			if (!self.isMsgForMe(data, "flickr")) { return; }

			self.clearText();
			if (data === null) {
				console.log("null photo data");
				return;
			}
			// console.log("next flickr: ", data.word, data.url);

			var baseId = self.dom.getPanelId(data.displayPanel);
			// var baseId = "#onetwothree";
			var output = _.template(tmpl.word, {word: data.word});
			$(baseId).html(output);
			$(baseId).find(".tmpl").fadeIn(FADE_TIME);

			$.backstretch(data['url'], {
				target: baseId,
				speed: FADE_TIME,
				positionType: "relative",
				zIndex: 10,
			});
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
