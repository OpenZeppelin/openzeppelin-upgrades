const { ethers, upgrades } = require('@nomiclabs/buidler');

async function main() {
  const Greeter = await ethers.getContractFactory('Greeter');
  console.log('Attempting to deploy Greeter contract...');
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!']);

  console.log('Attempting upgrade to InvalidGreeter...');
  const InvalidGreeter = await ethers.getContractFactory('InvalidGreeter');
  await upgrades.upgradeProxy(greeter.address, InvalidGreeter);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(1))
  .catch(error => {
    const { message } = error;
    const expectedError = 'New storage layout is incompatible';

    if (message === expectedError) {
      process.exit(0);
    } else {
      console.error('Expected:', expectedError);
      console.error('Actual  :', message);
      process.exit(1);
    }
  });
