const assert = require('assert');

const { deployBeacon, deployBeaconProxy } = require('@openzeppelin/truffle-upgrades');

const DeployOverload = artifacts.require('DeployOverload');

contract('DeployOverload', function () {
  it('deployBeaconProxy', async function () {
    const beacon = await deployBeacon(DeployOverload);
    const c = await deployBeaconProxy(beacon, { initializer: 'customInitialize' });
    assert.strictEqual((await c.value()).toString(), '42');
  });
});
