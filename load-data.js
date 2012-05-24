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

// possible data sources
// http://stackoverflow.com/questions/1594098/where-to-get-a-list-of-almost-all-the-words-in-english-language
// http://wordlist.sourceforge.net/
// http://www.englishclub.com/vocabulary/common-words-5000.htm

var readWords = function() {
	var stream = fs.createReadStream('data/words');
	var i = 0;
	new Lazy(stream)
	.lines
	.forEach(function(line) {
		i++;
		console.log(i + " => " + line.toString().toLowerCase());
		db.zadd("nsp:words", i, line.toString().toLowerCase());
	});
};
//readWords();

var addToDb = function(score, str) {
	console.log("Adding: " + score + " => " + str);
	db.zadd("nsp:words", score, str.toLowerCase().trim());
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