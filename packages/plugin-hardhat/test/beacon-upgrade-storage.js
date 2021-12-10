const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterStorageConflict = await ethers.getContractFactory('GreeterStorageConflict');
});

test('incompatible storage', async t => {
  const { Greeter, GreeterStorageConflict } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(beacon, ['Hola mundo!']);
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter, GreeterStorageConflict),
    undefined,
    'New storage layout is incompatible due to the following changes',
  );
});
