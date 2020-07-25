const assert = require('assert');

const { deployProxy, upgradeProxy } = require('@openzeppelin/upgrades-truffle');

const Adder = artifacts.require('Adder');
const AdderV2 = artifacts.require('AdderV2');

contract('Adder', function () {
  it('adding', async function () {
    const adder = await Adder.deployed();
    assert.strictEqual(await adder.add(1));
  });

  it('deployProxy', async function () {
    const adder = await deployProxy(Adder);
    await upgradeProxy(adder.address, AdderV2);
  });
});
