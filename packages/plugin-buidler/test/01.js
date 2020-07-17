const { ethers } = require('@nomiclabs/buidler');

const {
  deployProxy,
} = require('@openzeppelin/upgrades-buidler/dist/deploy-proxy');
const {
  upgradeProxy,
} = require('@openzeppelin/upgrades-buidler/dist/upgrade-proxy');

async function main() {
  const Greeter = await ethers.getContractFactory('Greeter');
  const greeter = await deployProxy(Greeter, ['Hello, Buidler!']);

  console.log('Attempting upgrade to GreeterV2...');
  const GreeterV2 = await ethers.getContractFactory('GreeterV2');
  const greeter2 = await upgradeProxy(greeter.address, GreeterV2);

  console.log('Resetting greeting...');
  const signer3 = (await ethers.getSigners())[1];
  const greeter3 = greeter2.connect(signer3);
  await greeter3.resetGreeting();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
