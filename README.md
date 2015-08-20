#Nodule command line client
This package provides a command line client that runs on any of the platforms supported by [noble](https://www.npmjs.com/package/noble) (currently OS X, Linux, Windows, RaspPI, Intel Edison).

##Installation
```sh
git clone https://github.com/noduleio/nodule_noble.git
npm install
```

`npm install` may take some time as there are several native modules that need to be built.

##Configuration
The default `config.js` file defaults to using the current machine's hostname as the id and name for the nodule client.

```js
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
```

You can replace `os.hostname()` with whatever values you choose, though you should make sure `unique_id` is unique accross all your command line clients.

`<ACCESS_TOKEN>` should be replaced with an access token that you have generated from [here](https://www.nodule.io/app.html#/apiTokens).

##Running
To start the client type:

```sh
sudo npm start
```

For information on running without sudo see the noble documentation - [Running without root/sudo](https://github.com/sandeepmistry/noble#running-on-linux)
