const { deployProxy } = require('@openzeppelin/upgrades-buidler/dist/deploy-proxy');

async function main() {
  const greeter = await deployProxy('Greeter', ['Hello, Buidler!']);
  console.log('Greeter deployed to:', greeter.address);
  await greeter.setGreeting('Bye');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
