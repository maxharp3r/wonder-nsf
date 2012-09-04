
// server configuration
exports.config = {

	app: {
		LISTEN_PORT: 8080,

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

		// if true, persist twitter messages to a less temporary location
		RECORD_TWITTER: true,
		// if true, download images when we fetch messages
		RECORD_IMAGES: true,
	},

	ui: {
		NUM_PANELS: 3,
		NUM_SCREENS: 1,
	},

	// redis keys
	dbkey: {
		EVENT_STREAM: "nsp:event_stream",
		MSG: "nsp:twitter:msg", // tweets
		MSG_PRIORITY: "nsp:twitter:priority:msg", // tweets that should be shown soon
		WORD_SCORES: "nsp:words", // sorted set, score is popularity rank
	},

	search: {
		TWITTER_STREAM_REGEX: /(^I wonder|^I think)/,
		PRIORITY_REGEX: /(#namac)/i,
		// PRIORITY_REGEX: /(when)/i,
		PRIORITY_LABEL: "NAMAC",
	},
};