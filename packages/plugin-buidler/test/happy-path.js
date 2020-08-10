const { ethers, upgrades } = require('@nomiclabs/buidler');

async function main() {
  const Greeter = await ethers.getContractFactory('Greeter');
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Buidler!']);

  console.log('Attempting upgrade to GreeterV2...');
  const GreeterV2 = await ethers.getContractFactory('GreeterV2');
  const greeter2 = await upgrades.upgradeProxy(greeter.address, GreeterV2);

  console.log('Resetting greeting...');
  await greeter2.resetGreeting();

  console.log('Preparing GreeterV3...');
  const GreeterV3 = await ethers.getContractFactory('GreeterV3');
  const greeter3ImplAddr = await upgrades.prepareUpgrade(greeter.address, GreeterV3);
  const greeter3 = GreeterV3.attach(greeter3ImplAddr);
  const version3 = await greeter3.version();
  if (version3 !== 'V3') throw new Error(`expected V3 but got ${version3}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
