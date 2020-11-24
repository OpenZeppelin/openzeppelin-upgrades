const assert = require('assert');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const DeployOverload = artifacts.require('DeployOverload');

contract('DeployOverload', function () {
  it('deployProxy', async function () {
    const c = await deployProxy(DeployOverload, { initializer: 'customInitialize' });
    assert.strictEqual((await c.value()).toString(), '42');
  });
});
