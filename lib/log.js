'use strict';

var bunyan = require('bunyan');
module.exports = bunyan.createLogger({
	name: 'nodule',
	streams: [{
		level: 'debug',
		stream: process.stdout
	}, {
		level: 'debug',
		path: 'nodule.log' // log ERROR and above to a file
	}]
});