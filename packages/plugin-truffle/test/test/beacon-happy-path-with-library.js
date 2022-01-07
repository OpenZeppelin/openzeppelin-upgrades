const assert = require('assert');
const BN = require('bn.js');

const { deployBeacon, deployBeaconProxy, upgradeBeacon } = require('@openzeppelin/truffle-upgrades');

const Adder = artifacts.require('Adder');
const AdderV2 = artifacts.require('AdderV2');

contract('Adder', function () {
  it('adds', async function () {
    const adder = await Adder.deployed();
    assert.strictEqual(new BN(await adder.n()).toNumber(), 0);
    await adder.add(1);
    assert.strictEqual(new BN(await adder.n()).toNumber(), 1);
  });

  it('deployProxy', async function () {
    const beacon = await deployBeacon(Adder);
    const adder = await deployBeaconProxy(beacon, Adder, [2]);
    assert.strictEqual(new BN(await adder.n()).toNumber(), 2);
    await upgradeBeacon(beacon, AdderV2);
  });
});
