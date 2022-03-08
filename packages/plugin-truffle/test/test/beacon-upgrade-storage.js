const assert = require('assert');

const { deployBeacon, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('GreeterProxiable');
const GreeterStorageConflict = artifacts.require('GreeterStorageConflictProxiable');

it('incompatible storage', async function () {
  const beacon = await deployBeacon(Greeter);
  await assert.rejects(
    () => upgradeBeacon(beacon, GreeterStorageConflict),
    error => error.message.includes('New storage layout is incompatible'),
  );
});

it('incompatible storage - forced', async function () {
  const beacon = await deployBeacon(Greeter);
  await upgradeBeacon(beacon, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
});
