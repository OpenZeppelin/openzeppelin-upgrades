const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.StorageInsertBetweenSlotsV1 = await ethers.getContractFactory('StorageInsertBetweenSlotsV1');
  t.context.StorageInsertBetweenSlotsV2_Ok = await ethers.getContractFactory('StorageInsertBetweenSlotsV2_Ok');
  t.context.StorageInsertBetweenSlotsV2_Bad = await ethers.getContractFactory('StorageInsertBetweenSlotsV2_Bad');
});

test('storage insert between slots - ok', async t => {
  const { StorageInsertBetweenSlotsV1, StorageInsertBetweenSlotsV2_Ok } = t.context;
  const greeter = await upgrades.deployProxy(StorageInsertBetweenSlotsV1, [], { kind: 'transparent' });
  await upgrades.upgradeProxy(greeter, StorageInsertBetweenSlotsV2_Ok);
});

test('storage insert between slots - bad', async t => {
  const { StorageInsertBetweenSlotsV1, StorageInsertBetweenSlotsV2_Bad } = t.context;
  const greeter = await upgrades.deployProxy(StorageInsertBetweenSlotsV1, [], { kind: 'transparent' });
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter, StorageInsertBetweenSlotsV2_Bad),
    undefined,
    'New storage layout is incompatible due to the following changes',
  );
});
