const Adder = artifacts.require('Adder');
const AdderV2 = artifacts.require('AdderV2');

const { deployProxy, upgradeProxy } = require('@openzeppelin/upgrades-truffle');

module.exports = async function (deployer) {
  const a = await deployProxy(Adder, [0], { deployer });
  await upgradeProxy(a.address, AdderV2, { deployer });
};
