
var client = {
	socket: null,
	
	dom: {
		results: $("div#results"),
		test_link: $("a#test"),
		go_link: $("a#go"),
	},
		
	init: function() {
		var self = this;
		this.dom.test_link.click(function() { self.socket.emit("test"); });
		this.dom.go_link.click(function() { self.socket.emit("go"); });
		this.listen();
	},
	
	listen: function() {
		var self = this;
		this.socket = io.connect('http://localhost:8080');
		this.socket.on('test', function (data) {
			self.dom.results.text(data.screen_name);
		});
		this.socket.on('twitter', function (data) {
			self.dom.results.text(data.completed_in);
		});
	},
};

$(document).ready(function() {
	client.init();
});