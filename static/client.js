var results = $("div#results");

var socket = io.connect('http://localhost:8080');
socket.on('test', function (data) {
	results.text(data.screen_name);
});
socket.on('twitter', function (data) {
	results.text(data.completed_in);
});

$("a#test").click(function() { socket.emit("test"); });
$("a#go").click(function() { socket.emit("go"); });
