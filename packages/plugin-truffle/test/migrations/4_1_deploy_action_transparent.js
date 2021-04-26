const Action = artifacts.require('Action');
const ActionV2 = artifacts.require('ActionV2');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const a = await deployProxy(Action, [], { deployer, kind: 'transparent' });
  await upgradeProxy(a.address, ActionV2, { deployer });
};
