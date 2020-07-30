const { ethers, upgrades } = require('@nomiclabs/buidler');

async function main() {
  const Greeter = await ethers.getContractFactory('Greeter');
  console.log('Attempting to deploy Greeter contract...');
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!']);

  console.log('Attempting upgrade to Invalid...');
  const Invalid = await ethers.getContractFactory('Invalid');
  await upgrades.upgradeProxy(greeter.address, Invalid);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(1))
  .catch(error => {
    const { message } = error;
    const expectedError = 'Contract `Invalid` is not upgrade safe';

    if (message === expectedError) {
      process.exit(0);
    } else {
      console.error('Expected:', expectedError);
      console.error('Actual  :', message);
      process.exit(1);
    }
  });
