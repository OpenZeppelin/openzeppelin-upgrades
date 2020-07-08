const { deployProxy } = require('@openzeppelin/upgrades-buidler/dist/deploy-proxy');
const { upgradeProxy } = require('@openzeppelin/upgrades-buidler/dist/upgrade-proxy');

async function main() {
  const greeter = await deployProxy('Greeter', ['Hello, Buidler!']);

  console.log('Attempting upgrade to GreeterV2...');
  await upgradeProxy(greeter.address, 'GreeterV2');

  console.log('Resetting greeting...');
  const signer2 = (await ethers.getSigners())[1];
  const Greeter2 = await ethers.getContractFactory('GreeterV2', signer2);
  const greeter2 = Greeter2.attach(greeter.address);
  await greeter2.resetGreeting();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
