/**
 * Load stuff into redis.
 */

var fs = require("fs");
var Lazy=require("lazy");
var redis = require("redis");
var underscore = require("./static/lib/underscore-1.3.1-min");

var db = redis.createClient();
db.on("error", function (err) {
	console.error("REDIS ERROR (server): " + err);
});

var addToDb = function(score, str) {
	var s = str.toLowerCase().trim();
	console.log("Adding: " + score + " => " + s);
	db.zscore("nsp:words", s, function(err, res) {
		if (!res) {
			// don't re-add
			db.zadd("nsp:words", score, s);
		} else {
			console.log("skipping (re-add): " + s);
		}
	});

};

// made this words list from the 12 dictionaries source,
// 2+2 google, then 2007neo
var readNeol = function() {
	var stream = fs.createReadStream('data/words');
	var i = 0;
	new Lazy(stream)
		.lines
		.forEach(function(lineAsBytes) {
			i++;
			var line = lineAsBytes.toString();

			if (line.match(/^----/)) {
				// do nothing
				console.log("skipping: ", line);
			} else if (line.match(/^    /) || line.match(/^[a-zA-Z]* -> /)) {
				underscore.each(line.split(/[^a-zA-Z]/), function(word) {
					if (word.length > 0) {
						addToDb(i, word);
					}
				});
			} else if (line.match(/ /)) {
				// do nothing
				console.log("skipping: ", line);
			} else if (line.length > 0) {
				addToDb(i, line);
			}

			// console.log(i + " => " + line.toString().toLowerCase());
			// db.zadd("nsp:words", i, line.toString().toLowerCase());
		});
};
readNeol();

// process.exit(code=0);