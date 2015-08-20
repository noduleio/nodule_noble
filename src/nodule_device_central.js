var log = require('./log');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var noble = require('noble');
var UUID = require('uuid');

function rssiToBars(rssi) {
    var numberBars = 0;
    if(rssi > -40) {
        numberBars = 5;
    } else if(rssi > -50) {
        numberBars = 4;
    } else if(rssi > -60) {
        numberBars = 3;
    } else if(rssi > -70) {
        numberBars = 2;
    } else if(rssi > -80) {
        numberBars = 1;
    } else {
        numberBars = 0;
    }
    return numberBars;
}

function devicesToJson(devices) {
    return devices.map(function(device) {
        return {
            name : device.advertisement.localName || "Uknown Device",
            id : device.uuid,
            advertisedServices: device.advertisement.serviceUuids,
            numberBars: rssiToBars(device.rssi)
        }
    });
}

function normaliseUUID(uuid) {
    if(uuid.length == 32) {
        uuid = UUID.unparse(UUID.parse(uuid));
    }
    return uuid.toUpperCase();
}

function NoduleDeviceCentral(uniqueId, name) {
    var devices = [];
    this.deviceName = name || os.hostname;
    this.objId = uniqueId || UUID.v4();
    var self = this;

    function startNoble() {

        noble.startScanning();
        noble.on('discover', (peripheral) => {
            console.log('Discovered peripher', peripheral.uuid);
            var existing = _.find(devices, function(device) { return device.uuid === peripheral.uuid; });
            if(existing) {
                existing.lastSeen = new Date().getTime();
            } else {
                peripheral.lastSeen = new Date().getTime();
                devices.push(peripheral);
            }
            // TODO kill dead devices
            updateDevicesThrottled();
        });
        // });
        // var deadDevices = _.filter(self.devices, function(device) {
        //     return !_.some(newDevices, function(newDevice) { return device.id === newDevice.id; });
        // });
        // deadDevices.forEach(function(deadDevice) {
        //     self.devices.splice(self.devices.indexOf(deadDevice), 1);
        // });
        // 
    }

    this.startScanning = function() {
        console.log('startScanning called');
        return new Promise((resolve, reject) => {
            if(noble.state == 'poweredOn') {
                console.log('noble is powered on');
                startNoble();
                resolve(devicesToJson(devices));
            } else {
                console.log('waiting for noble to power up');
                noble.on('stateChange', function(state) {
                    if (state === 'poweredOn') {
                        console.log('noble is powered on');
                        startNoble();
                        resolve(devicesToJson(devices));
                    }
                });
            }
        });
    }

    this.stopScanning = function() {
        return new Promise((resolve, reject) => {
            noble.stopScanning();
            resolve(true);
        });
    };

    var updateDevicesThrottled = _.throttle(updateDevices, 1000)

    function updateDevices() {
        var devicesJson = devicesToJson(devices);
        if(self.raiseEvent) {
            self.raiseEvent('peripherals_updated', devicesJson);
        }
    };

    function getDevice(deviceId) {
        return _.find(devices, function(device) { return device.uuid === deviceId });
    };

    function resolveProfile(device, deviceId, resolve, reject) {
        device.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
            if(error) {
                reject(error);
                device.disconnect();
            } else {
                function processCharacteristics(service, characteristics, done) {
                    if(characteristics.length > 0) {
                        var characteristic = characteristics.shift();
                        characteristic.UUID = normaliseUUID(characteristic.uuid);
                        characteristic.on('data', function(data) { 
                            if(data) { 
                                let hex = data.toString('hex');
                                let text = data.toString();
                                log.debug('Read Value', deviceId, service.UUID, characteristic.UUID, hex, text);
                                if(self.raiseEvent) {
                                    self.raiseEvent('characteristic_value_updated', deviceId, service.UUID, characteristic.UUID, hex, text); 
                                } 
                            }
                        });
                        characteristic.discoverDescriptors(function(error, descriptors) {
                            var descriptionDescriptor = _.find(descriptors, function(descriptor) { return descriptor.uuid == '2901'; });
                            if(descriptionDescriptor) {
                                descriptionDescriptor.readValue(function(error, description) { 
                                    console.log('Got', description.toString());
                                    characteristic.description = description.toString(); 
                                    processCharacteristics(service, characteristics, done);
                                });                                    
                            } else {
                                processCharacteristics(service, characteristics, done);
                            }
                        });
                    } else {
                        done();
                    }
                }
                function processServices(services) {
                    if(services.length > 0) {
                        var service = services.shift();
                        service.UUID = normaliseUUID(service.uuid);
                        processCharacteristics(service, _.clone(service.characteristics), function() {
                            processServices(services);
                        });
                    } else {
                        var profile = {
                            name: device.advertisement.localName,
                            services: device.services.map(function(service) {
                                return {
                                    UUID: service.UUID,
                                    characteristics: service.characteristics.map(function(characteristic) {
                                        return  {
                                            UUID: characteristic.UUID,
                                            description: characteristic.description,
                                            canRead: _.contains(characteristic.properties, 'read'),
                                            canWrite: _.contains(characteristic.properties, 'write') || _.contains(characteristic.properties, 'writeWithoutResponse'),
                                            notifies: _.contains(characteristic.properties, 'notify') || _.contains(characteristic.properties, 'broadcast'),
                                        };
                                    }).reduce(function(memo, characteristic) { memo[characteristic.UUID] = characteristic; return memo }, {})
                                };
                            }).reduce(function(memo, service) { memo[service.UUID] = service; return memo }, {})
                        }
                        resolve(profile)
                    }
                }
                processServices(_.clone(services));
            }
        });
    }

    this.connectPeripheral = function(deviceId) {
        return new Promise((resolve, reject) => {
            var existingDevice = _.find(devices, function(device) { return device.uuid === deviceId });
            if(existingDevice) {
                if(existingDevice.state == 'connected') {
                    resolveProfile(existingDevice, deviceId, resolve, reject);
                } else {
                    existingDevice.connect((error) => {
                        if(error) {
                            reject(error);
                        } else {
                            resolveProfile(existingDevice, deviceId, resolve, reject);
                        }
                    });
                }
            } else {
                reject(new Error('Peripheral not found'));
            }
        });
    };

    function execute(peripheralId, serviceId, characteristicId, command) {
        return new Promise((resolve, reject) => {
            var device = getDevice(peripheralId);
            if(device) {
                var service = _.find(device.services, function(service) { return service.UUID == serviceId; });
                if(service) {
                    var characteristic = _.find(service.characteristics, function(characteristic) { return characteristic.UUID == characteristicId });
                    if(characteristic) {
                        command(resolve, reject, characteristic);
                    } else {
                        log.error('Unkown characteristic', characteristicId);
                        reject(new Error('Unknown characteristic'));
                    }
                } else {
                    log.error('Unkown service', serviceId);
                    reject(new Error('Unknown service'));
                }
            } else {
                log.error('Unknown peripheral', peripheralId);
                reject(new Error('Could not find peripheral'));
            }
        });
    }

    this.readCharacteristic = function(peripheralId, serviceId, characteristicId) {
        return execute(peripheralId, serviceId, characteristicId, function(resolve, reject, characteristic) {
            log.debug('Reading', peripheralId, serviceId, characteristicId);
            characteristic.read(function(error, data) {
                if(error) {
                    log.error('Error reading', peripheralId, serviceId, characteristicId);
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    };

    this.writeCharacteristic = function(peripheralId, serviceId, characteristicId, hex) {
        return execute(peripheralId, serviceId, characteristicId, function(resolve, reject, characteristic) {
            var writeWithoutResponse =  _.contains(characteristic.properties, 'writeWithoutResponse');
            var data = new Buffer(hex, 'hex');
            log.debug('Writing', peripheralId, serviceId, characteristicId, hex);
            characteristic.write(data, writeWithoutResponse, function(error) {
                if(error) {
                    log.error('Error writing', peripheralId, serviceId, characteristicId, hex);
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    };

    this.setNotifyState = function(peripheralId, serviceId, characteristicId, state) {
        return execute(peripheralId, serviceId, characteristicId, function(resolve, reject, characteristic) {
            log.debug('Set nofify state', peripheralId, serviceId, characteristicId, state);
            characteristic.notify(state, function(error) {
                if(error) {
                    log.error('Error setting notify state', peripheralId, serviceId, characteristicId, state);
                    reject(error);
                } else {
                    resolve(true);
                }
            });
        });
    };
/*
    _didDisconnectPeripheral = function(peripheralId, reason) {
        console.log('didDisconnectPeripheral', peripheralId);
        if(this.raiseEvent) {
            console.log('Raising Device disconnected', peripheralId);
            this.raiseEvent('device_disconnected', peripheralId, reason);
        }        
    }*/
}

module.exports = NoduleDeviceCentral;
