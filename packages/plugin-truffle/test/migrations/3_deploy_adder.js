const Adder = artifacts.require('Adder');
const AdderV2 = artifacts.require('AdderV2');
const AdderV3 = artifacts.require('AdderV3');
const SafeAddExternal = artifacts.require('SafeAddExternal');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const a = await deployProxy(Adder, [0], { deployer });
  await upgradeProxy(a.address, AdderV2, { deployer });

  await deployer.deploy(SafeAddExternal);
  await deployer.link(SafeAddExternal, AdderV3);
  await upgradeProxy(a.address, AdderV3, { deployer, unsafeAllowLinkedLibraries: true });
};
