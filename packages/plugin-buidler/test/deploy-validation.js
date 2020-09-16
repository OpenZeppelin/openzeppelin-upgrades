const { ethers, upgrades } = require('@nomiclabs/buidler');
const expectError = require('./expectError');

async function main() {
  const Invalid = await ethers.getContractFactory('Invalid');
  console.log('Attempting to deploy Invalid contract...');
  await upgrades.deployProxy(Invalid);
}

expectError(main, 'Contract `Invalid` is not upgrade safe');
