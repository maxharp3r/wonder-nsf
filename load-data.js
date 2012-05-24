/**
 * Load stuff into redis.
 */

var fs = require("fs");
var Lazy=require("lazy");
var redis = require("redis");

var db = redis.createClient();
db.on("error", function (err) {
	console.error("REDIS ERROR (server): " + err);
});

var stream = fs.createReadStream('data/words');
var i = 0;
new Lazy(stream)
	.lines
	.forEach(function(line) {
		i++;
		console.log(i + " => " + line.toString().toLowerCase());
		db.zadd("nsp:words", i, line.toString().toLowerCase());
	});

// process.exit(code=0);