const { ethers, upgrades } = require('@nomiclabs/buidler');
const expectError = require('./expectError');

async function main() {
  const Greeter = await ethers.getContractFactory('Greeter');
  console.log('Attempting to deploy Greeter contract...');
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!']);

  console.log('Attempting upgrade to GreeterStorageConflict...');
  const GreeterStorageConflict = await ethers.getContractFactory('GreeterStorageConflict');
  await upgrades.upgradeProxy(greeter.address, GreeterStorageConflict);
}

expectError(main, 'New storage layout is incompatible due to the following changes');
