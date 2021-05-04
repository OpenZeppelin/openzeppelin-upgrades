const Adder = artifacts.require('Adder');
const AdderV2 = artifacts.require('AdderV2');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const a = await deployProxy(Adder, [0], { deployer, kind: 'transparent' });
  await upgradeProxy(a, AdderV2, { deployer });
};
