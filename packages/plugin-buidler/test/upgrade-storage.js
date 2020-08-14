const { ethers, upgrades } = require('@nomiclabs/buidler');
const expectError = require('./expectError');

async function main() {
  const Greeter = await ethers.getContractFactory('Greeter');
  console.log('Attempting to deploy Greeter contract...');
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!']);

  console.log('Attempting upgrade to InvalidGreeter...');
  const InvalidGreeter = await ethers.getContractFactory('InvalidGreeter');
  await upgrades.upgradeProxy(greeter.address, InvalidGreeter);
}

expectError(main, 'New storage layout is incompatible due to the following changes');
