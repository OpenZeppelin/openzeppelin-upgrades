const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');

const { deployProxy, upgradeProxy } = require('@openzeppelin/upgrades-truffle');

module.exports = async function (deployer) {
  const g = await deployProxy(Greeter, ['Hello Truffle'], { deployer });
  await upgradeProxy(g.address, GreeterV2, { deployer });
};
