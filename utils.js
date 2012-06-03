
/**
 * Returns a random integer between min and max
 * Using Math.round() will give you a non-uniform distribution!
 */
// http://stackoverflow.com/questions/1527803/generating-random-numbers-in-javascript-in-a-specific-range
exports.getRandomInt = function (min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

