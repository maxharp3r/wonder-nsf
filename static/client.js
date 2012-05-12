
var client = {
	socket: null,

	dom: {
		results: $("div#results"),
		test_link: $("a#test"),
		go_link: $("a#go"),
	},

	init: function() {
		var self = this;
		this.dom.test_link.click(function() {
			self.socket.emit("test");
			self.dom.results.text("waiting for twitter...");
		});
		this.dom.go_link.click(function() {
			self.socket.emit("go");
			self.dom.results.text("searching...");
		});
		this.listen();
	},

	listen: function() {
		var self = this;
		this.socket = io.connect('http://localhost:8080');
		this.socket.on('test', function (data) {
			console.log("received test", data);
			self.dom.results.text("twitter says my username is: " + data.screen_name);
		});
		this.socket.on('twitter', function (data) {
			console.log("received twitter", data);
			self.dom.results.text(data.completed_in);
		});
	},
};

$(document).ready(function() {
	client.init();
});