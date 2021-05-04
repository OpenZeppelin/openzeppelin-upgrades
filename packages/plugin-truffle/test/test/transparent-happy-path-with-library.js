const assert = require('assert');
const BN = require('bn.js');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

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
    const adder = await deployProxy(Adder, [2], { kind: 'transparent' });
    assert.strictEqual(new BN(await adder.n()).toNumber(), 2);
    await upgradeProxy(adder, AdderV2);
  });
});
