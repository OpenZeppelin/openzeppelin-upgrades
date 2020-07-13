const Greeter = artifacts.require('Greeter');

const { deployProxy } = require('@openzeppelin/upgrades-truffle');

module.exports = async function (deployer) {
  await deployProxy(Greeter, ['Hello Truffle'], { deployer });
}
