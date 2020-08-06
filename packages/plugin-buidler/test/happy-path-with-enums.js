const { ethers, upgrades } = require('@nomiclabs/buidler');

async function withoutFlag() {
  const Action = await ethers.getContractFactory('Action');
  const action = await upgrades.deployProxy(Action);

  console.log('Attempting upgrade to ActionV2...');
  const ActionV2 = await ethers.getContractFactory('ActionV2');
  await upgrades.upgradeProxy(action.address, ActionV2);
}

async function withFlag() {
  const Action = await ethers.getContractFactory('Action');
  const action = await upgrades.deployProxy(Action, [], { unsafeAllowCustomTypes: true });

  console.log('Attempting upgrade to ActionV2...');
  const ActionV2 = await ethers.getContractFactory('ActionV2');
  await upgrades.upgradeProxy(action.address, ActionV2, { unsafeAllowCustomTypes: true });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
withoutFlag()
  .then(() => {
    // this should not happen
    console.error('Expected failure did not happen');
    process.exit(1);
  })
  .catch(error => {
    console.error(error);
    return withFlag();
  })
  .then(() => process.exit(0))
  .catch(error => {
    // this should not happen
    console.error(error);
    process.exit(1);
  });
