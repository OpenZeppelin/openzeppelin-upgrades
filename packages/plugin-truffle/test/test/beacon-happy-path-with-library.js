const assert = require('assert');
const BN = require('bn.js');

const { deployBeacon, deployBeaconProxy, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

const Adder = artifacts.require('Adder');
const AdderV2 = artifacts.require('AdderV2');

contract('Adder', function () {
  it('deployProxy', async function () {
    const beacon = await deployBeacon(Adder);
    const adder = await deployBeaconProxy(beacon, [2]);
    assert.strictEqual(new BN(await adder.n()).toNumber(), 2);
    await upgradeBeacon(beacon, AdderV2);
  });
});
