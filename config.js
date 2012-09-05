
// server configuration
exports.config = {

	app: {
		LISTEN_PORT: 8080,
		IMAGES_PATH: './images/',

		// if true, send content to browsers
		DO_EMIT: true,
		// if true, draw content from the db rather from API searches
		DO_EMIT_FROM_REPLAY: false,
		// if true, stash content in the db for future replay
		DO_SAVE_FOR_REPLAY: false,

		// emit or save every n millis
		NEXT_EVENT_INTERVAL_MS: 3.5 * 1000,

		// check the state of the tracker every n millis
		CHECK_TWITTER_HEALTH_MS: 10 * 1000,
		// no more than 1 message every n millis
		RATE_LIMIT_MS: 2 * 1000,

		// a delay interval for recording content
		// TODO: this could be much faster. However, the nsp code currently assumes a slower
		// pace, and sets global variables with flickr data. Migrate this code to use redis
		// to scale the recording pace.
		RECORDING_SPEED_MS: 1.5 * 1000,
	},

	ui: {
		NUM_PANELS: 3,
		NUM_SCREENS: 1,
	},

	// redis keys
	dbkey: {
		EVENT_STREAM: "nsp:event_stream",

		// list: recorded tweets and images
		RECORDED: "nsp:recorded",

		// MSG and MSG_PRIORITY contain their own queue of content, and are the
		// prefixes for keys like nsp:twitter:msg:12345:words
		MSG: "nsp:twitter:msg",
		MSG_PRIORITY: "nsp:twitter:priority:msg",

		// sorted set: score is popularity rank
		WORD_SCORES: "nsp:words",
	},

	search: {
		TWITTER_STREAM_REGEX: /(^I wonder|^I think)/,
		PRIORITY_REGEX: /(namac)/i,
		// PRIORITY_REGEX: /(when)/i,
		PRIORITY_LABEL: "NAMAC",
	},
};