var os = require('os');

module.exports = {
	// set a unique id for this client
	unique_id: os.hostname(),
	// give this client a name
	name: os.hostname(),
	// server address
	endPoint: 'wss://app.nodule.io',
	// access token
	accessToken: '<ACCESS_TOKEN>'
}