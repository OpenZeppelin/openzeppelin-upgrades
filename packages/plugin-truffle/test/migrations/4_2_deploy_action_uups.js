const Action = artifacts.require('ActionProxiable');
const ActionV2 = artifacts.require('ActionV2Proxiable');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const a = await deployProxy(Action, [], { deployer, kind: 'uups' });
  await upgradeProxy(a.address, ActionV2, { deployer });
};
