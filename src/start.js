var Client = require('websocketrpc').Client;
var log = require('./log');
var NoduleDeviceCentral = require('./nodule_device_central');
var _ = require('lodash');
var config = require('../config');

var deviceCentral = new NoduleDeviceCentral(config.unique_id, config.name);

var client = new Client(config.unique_id);
client.on('connected', function() {
	client.addLocalObject(deviceCentral);
});
client.on('disconnected', function(isError) {
	if(isError) {
		log.error('Lost connection to nodule');
	} else {
		log.info('Disconnected from nodule');
	}
	process.exit();
});

process.on('SIGINT', function() {
	log.info('Disconnecting');
	client.disconnect();
});

client.connect(config.endPoint, config.accessToken).then(function() {
	log.info("Connected to nodule");
}, function(error) {
	log.error(error);
	log.error('Connect rejected');
	process.exit();
});
