const Greeter = artifacts.require('GreeterProxiable');
const GreeterV2 = artifacts.require('GreeterV2Proxiable');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const assert = require('assert');

module.exports = async function (deployer) {
  const g = await deployProxy(Greeter, ['Hello Truffle'], { deployer, kind: 'uups' });
  assert.equal(Greeter.address, g.address);
  assert.equal(Greeter.transactionHash, g.transactionHash);

  await upgradeProxy(g, GreeterV2, { deployer });
};
