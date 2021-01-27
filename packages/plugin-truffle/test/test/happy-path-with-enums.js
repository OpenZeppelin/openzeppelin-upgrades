const assert = require('assert');
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Action = artifacts.require('Action');
const ActionV2 = artifacts.require('ActionV2');
const ActionV2Bad = artifacts.require('ActionV2Bad');

contract('Action', function () {
  it('compatible enums', async function () {
    const action = await deployProxy(Action, []);
    await upgradeProxy(action.address, ActionV2);
  });

  it('incompatible enums', async function () {
    const action = await deployProxy(Action, []);
    await assert.rejects(upgradeProxy(action.address, ActionV2Bad), error =>
      error.message.includes('Upgraded `action` to an incompatible type'),
    );
  });
});
