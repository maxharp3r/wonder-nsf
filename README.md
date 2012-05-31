wonder-nsf
==========

Northern spark project code

Running
-------

To run: `node ./server.js` then visit http://localhost:8080


API Keys
--------

* Requires a file called keys.js (see keys-example.js).  Need these keys:
  * Twitter
  * Flickr


Dependencies
------------

* Node
* Redis
  * brew install redis
  * https://github.com/mranney/node_redis - npm install redis
  * (client access: `redis.cli` )


Docs
----

* socket.io - https://github.com/learnboost/socket.io
* node_redis - https://github.com/mranney/node_redis
* Twitter API
  * https://github.com/AvianFlu/ntwitter
  * https://dev.twitter.com/docs/api/1/get/search
  * https://dev.twitter.com/docs/using-search
* Flickr API
  * http://www.flickr.com/services/api/
  * http://www.flickr.com/services/api/misc.urls.html


Data
----

* http://stackoverflow.com/questions/1594098/where-to-get-a-list-of-almost-all-the-words-in-english-language
* http://wordlist.sourceforge.net/
  * http://wordlist.sourceforge.net/12dicts-readme-r5.html
