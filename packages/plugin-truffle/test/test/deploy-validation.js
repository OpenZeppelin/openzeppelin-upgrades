const assert = require('assert');
const upgrades = require('@openzeppelin/truffle-upgrades');

const InvalidFactory = artifacts.require('Invalid');

contract('Invalid', function () {
  it('Invalid contract fails validation', async function () {
    await assert.rejects(upgrades.deployProxy(InvalidFactory));
  });

  it('is deployable with skipall', async function () {
    const invalid = await upgrades.deployProxy(InvalidFactory, { skipAll: true });
    assert.ok(invalid.transactionHash, 'transaction hash is missing');
  });
});
