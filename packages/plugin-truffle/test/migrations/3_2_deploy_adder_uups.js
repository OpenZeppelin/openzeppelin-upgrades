const Adder = artifacts.require('AdderProxiable');
const AdderV2 = artifacts.require('AdderV2Proxiable');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const a = await deployProxy(Adder, [0], { deployer, kind: 'uups' });
  await upgradeProxy(a.address, AdderV2, { deployer });
};
