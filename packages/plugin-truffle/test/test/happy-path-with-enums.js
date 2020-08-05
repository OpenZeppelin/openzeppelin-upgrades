const assert = require('assert');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Action = artifacts.require('Action');
const ActionV2 = artifacts.require('ActionV2');

contract('Action', function () {
  it('deployProxy', async function () {
    await assert.rejects(deployProxy(Action));

    // we need use the flag to deploy in order to have an address to upgrade
    const action = await deployProxy(Action, [], { unsafeAllowCustomTypes: true });
    await assert.rejects(upgradeProxy(action.address, ActionV2));
  });

  it('deployProxy', async function () {
    const action = await deployProxy(Action, [], { unsafeAllowCustomTypes: true });
    await upgradeProxy(action.address, ActionV2, { unsafeAllowCustomTypes: true });
  });
});
