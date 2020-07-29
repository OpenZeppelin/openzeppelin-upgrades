const { ethers, upgrades } = require('@nomiclabs/buidler');

async function main() {
  const Adder = await ethers.getContractFactory('Adder');
  const adder = await upgrades.deployProxy(Adder);

  console.log('Attempting upgrade to AdderV2...');
  const AdderV2 = await ethers.getContractFactory('AdderV2');
  const adder2 = await upgrades.upgradeProxy(adder.address, AdderV2);

  console.log('Adding...');
  await adder2.add(1);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
