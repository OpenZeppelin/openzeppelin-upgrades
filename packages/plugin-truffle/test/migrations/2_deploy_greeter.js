const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');

const { deployProxy, upgradeProxy } = require('@openzeppelin/upgrades-truffle');

const { promisify } = require('util');
const sleep = promisify(setTimeout);

module.exports = async function (deployer) {
  const g = await deployProxy(Greeter, ['Hello Truffle'], { deployer });
  console.log('sleeping');
  await sleep(1000);
  console.log('slept');
  await upgradeProxy(g.address, GreeterV2, { deployer });
}
