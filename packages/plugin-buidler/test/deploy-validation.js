const { ethers, upgrades } = require('@nomiclabs/buidler');

async function main() {
  const Invalid = await ethers.getContractFactory('Invalid');
  console.log('Attempting to deploy Invalid contract...');
  await upgrades.deployProxy(Invalid);
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
