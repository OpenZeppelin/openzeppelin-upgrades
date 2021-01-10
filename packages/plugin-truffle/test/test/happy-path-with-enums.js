const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const Action = artifacts.require('Action');
const ActionV2 = artifacts.require('ActionV2');

contract('Action', function () {
  it('deployProxy', async function () {
    const action = await deployProxy(Action, []);
    await upgradeProxy(action.address, ActionV2);
  });
});
