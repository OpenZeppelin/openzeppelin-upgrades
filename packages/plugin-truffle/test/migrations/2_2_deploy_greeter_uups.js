const Greeter = artifacts.require('GreeterProxiable');
const GreeterV2 = artifacts.require('GreeterV2Proxiable');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const assert = require('assert');

module.exports = async function (deployer) {
  const g = await deployProxy(Greeter, ['Hello Truffle'], { deployer, kind: 'uups' });

  assert.equal(Greeter.address, g.address);
  assert.equal(Greeter.transactionHash, g.transactionHash);

  const upgraded = await upgradeProxy(g, GreeterV2, { deployer });

  assert.equal(GreeterV2.address, upgraded.address);
  assert.equal(GreeterV2.transactionHash, upgraded.transactionHash);
  assert.notEqual(GreeterV2.transactionHash, Greeter.transactionHash);
};
