const { expect } = require('chai');

const { ethers, upgrades } = require('hardhat');

describe('Transparent Upgrade Storage Insert Between Slots', async () => {
  let context;
  beforeEach(async () => {
    const StorageInsertBetweenSlotsV1 = await ethers.getContractFactory('StorageInsertBetweenSlotsV1');
    const StorageInsertBetweenSlotsV2_Ok = await ethers.getContractFactory('StorageInsertBetweenSlotsV2_Ok');
    const StorageInsertBetweenSlotsV2_Bad = await ethers.getContractFactory('StorageInsertBetweenSlotsV2_Bad');
    context = {
      StorageInsertBetweenSlotsV1,
      StorageInsertBetweenSlotsV2_Ok,
      StorageInsertBetweenSlotsV2_Bad,
    };
  });

  it('storage insert between slots - ok', async () => {
    const { StorageInsertBetweenSlotsV1, StorageInsertBetweenSlotsV2_Ok } = context;
    const greeter = await upgrades.deployProxy(StorageInsertBetweenSlotsV1, [], { kind: 'transparent' });
    await upgrades.upgradeProxy(greeter, StorageInsertBetweenSlotsV2_Ok);
  });

  it('storage insert between slots - bad', async () => {
    const { StorageInsertBetweenSlotsV1, StorageInsertBetweenSlotsV2_Bad } = context;
    const greeter = await upgrades.deployProxy(StorageInsertBetweenSlotsV1, [], { kind: 'transparent' });
    await expect(upgrades.upgradeProxy(greeter, StorageInsertBetweenSlotsV2_Bad)).to.be.rejectedWith(/New storage layout is incompatible.*/);
  });
});
