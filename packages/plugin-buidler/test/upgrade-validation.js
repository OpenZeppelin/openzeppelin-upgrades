const { ethers, upgrades } = require('@nomiclabs/buidler');
const expectError = require('./expectError');

async function main() {
  const Greeter = await ethers.getContractFactory('Greeter');
  console.log('Attempting to deploy Greeter contract...');
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!']);

  console.log('Attempting upgrade to Invalid...');
  const Invalid = await ethers.getContractFactory('Invalid');
  await upgrades.upgradeProxy(greeter.address, Invalid);
}

expectError(main, 'Contract `Invalid` is not upgrade safe');
