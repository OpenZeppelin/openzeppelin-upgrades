const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterStorageConflict = await ethers.getContractFactory('GreeterStorageConflict');
});

test('incompatible storage', async t => {
  const { Greeter, GreeterStorageConflict } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  await t.throwsAsync(
    () => upgrades.upgradeBeacon(beacon, GreeterStorageConflict),
    undefined,
    'New storage layout is incompatible due to the following changes',
  );
});

test('incompatible storage - forced', async t => {
  const { Greeter, GreeterStorageConflict } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  await upgrades.upgradeBeacon(beacon, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
});
