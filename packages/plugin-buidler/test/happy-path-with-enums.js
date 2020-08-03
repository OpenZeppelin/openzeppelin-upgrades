const { ethers, upgrades } = require('@nomiclabs/buidler');

async function main() {
  const Action = await ethers.getContractFactory('Action');
  const action = await upgrades.deployProxy(Action);

  console.log('Attempting upgrade to ActionV2...');
  const ActionV2 = await ethers.getContractFactory('ActionV2');
  await upgrades.upgradeProxy(action.address, ActionV2);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
