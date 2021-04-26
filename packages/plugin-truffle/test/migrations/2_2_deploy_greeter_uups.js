const Greeter = artifacts.require('GreeterProxiable');
const GreeterV2 = artifacts.require('GreeterV2Proxiable');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const g = await deployProxy(Greeter, ['Hello Truffle'], { deployer, kind: 'uups' });
  await upgradeProxy(g.address, GreeterV2, { deployer });
};
