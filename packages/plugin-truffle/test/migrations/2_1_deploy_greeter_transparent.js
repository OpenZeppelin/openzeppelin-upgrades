const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const assert = require('assert');

module.exports = async function (deployer) {
  const g = await deployProxy(Greeter, ['Hello Truffle'], { deployer, kind: 'transparent' });

  assert.equal(Greeter.address, g.address);
  assert.equal(Greeter.transactionHash, g.transactionHash);

  await upgradeProxy(g, GreeterV2, { deployer });

  assert.equal(GreeterV2.address, Greeter.address);
  assert.notEqual(GreeterV2.transactionHash, Greeter.transactionHash);
};
