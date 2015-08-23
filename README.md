#Nodule command line app
This package provides a command line app for the [nodule.io system](https://www.nodule.io) that runs on any of the platforms supported by [noble](https://www.npmjs.com/package/noble) (currently OS X, Linux, Windows, RaspberryPI, Intel Edison).

##Installation

See specific prerequisites for RaspberryPI/Linux and Windows below.

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

## RaspberryPI Setup

Make sure your Pi is all up to date:

```sh
sudo apt-get update
sudo apt-get upgrade
```

Install the bluetooth package:

```sh
sudo apt-get install bluetooth
```

Make sure your bluetooth dongle is recognised:

```sh
lsusb
hcitool dev
```

[Install node:](http://node-arm.herokuapp.com/)

```sh
wget http://node-arm.herokuapp.com/node_latest_armhf.deb
sudo dpkg -i node_latest_armhf.deb
```

Now proceed with the normal install instructions.

## Windows Setup

Out of the box support on windows for Bluetooth dongles is not very good.

You will need a spare Bluetooth4.0 dongle that you can use for nodule.

Then follow the instructions [here](https://github.com/sandeepmistry/noble#windows) to get the prerequisites for noble installed.

* [node-gyp requirements for Windows](https://github.com/TooTallNate/node-gyp#installation)
   * [Python 2.7](https://www.python.org/download/releases/2.7/)
   * Visual Studio ([Express](https://www.visualstudio.com/en-us/products/visual-studio-express-vs.aspx))
* [node-bluetooth-hci-socket prerequisites](https://github.com/sandeepmistry/node-bluetooth-hci-socket#windows)
   * Compatible Bluetooth 4.0 USB adapter
   * [WinUSB](https://msdn.microsoft.com/en-ca/library/windows/hardware/ff540196(v=vs.85).aspx) driver setup for Bluetooth 4.0 USB adapter, using [Zadig tool](http://zadig.akeo.ie/)

Make sure to read [this](https://github.com/sandeepmistry/node-bluetooth-hci-socket#windows-1) if your dongle doesn't seem to be recognised.
