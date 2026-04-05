let noble;
try {
  noble = require('@abandonware/noble');
} catch (e) {
  noble = null;
}

let isScanning = false;
let nobleReady = false;

if (noble) {
  noble.on('stateChange', (state) => {
    nobleReady = state === 'poweredOn';
  });
}

/**
 * Scan for nearby Bluetooth Low Energy devices.
 * @param {number} durationMs - How long to scan in milliseconds (default 5000)
 * @returns {Promise<Array>} List of discovered devices
 */
function scanDevices(durationMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!noble) {
      return reject(new Error('Módulo Bluetooth não está disponível'));
    }

    if (isScanning) {
      return reject(new Error('Escaneamento já em andamento, tente novamente em instantes'));
    }

    const devices = [];
    const seen = new Set();
    isScanning = true;

    const discoverHandler = (peripheral) => {
      if (seen.has(peripheral.address)) return;
      seen.add(peripheral.address);

      devices.push({
        id: peripheral.id,
        address: peripheral.address,
        addressType: peripheral.addressType || null,
        name: peripheral.advertisement?.localName || null,
        rssi: peripheral.rssi,
        serviceUuids: peripheral.advertisement?.serviceUuids || [],
        manufacturerData: peripheral.advertisement?.manufacturerData
          ? peripheral.advertisement.manufacturerData.toString('hex')
          : null,
      });
    };

    const cleanup = (err) => {
      noble.stopScanning();
      noble.removeListener('discover', discoverHandler);
      isScanning = false;
      if (err) reject(err);
      else resolve(devices);
    };

    const timeout = setTimeout(() => cleanup(null), durationMs);

    noble.on('discover', discoverHandler);

    const startScan = () => {
      const state = noble.state;
      if (state === 'poweredOn') {
        noble.startScanning([], true);
      } else if (state === 'poweredOff') {
        clearTimeout(timeout);
        cleanup(new Error('Adaptador Bluetooth está desligado'));
      } else if (state === 'unsupported') {
        clearTimeout(timeout);
        cleanup(new Error('Bluetooth não é suportado neste dispositivo'));
      } else if (state === 'unauthorized') {
        clearTimeout(timeout);
        cleanup(new Error('Acesso ao Bluetooth não autorizado'));
      } else {
        // still 'unknown' or 'resetting' — wait for stateChange
        const stateHandler = (s) => {
          noble.removeListener('stateChange', stateHandler);
          if (s === 'poweredOn') {
            noble.startScanning([], true);
          } else {
            clearTimeout(timeout);
            cleanup(new Error(`Bluetooth indisponível: ${s}`));
          }
        };
        noble.once('stateChange', stateHandler);
      }
    };

    startScan();
  });
}

module.exports = { scanDevices };
