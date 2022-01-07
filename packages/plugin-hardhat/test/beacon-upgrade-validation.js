const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.Invalid = await ethers.getContractFactory('Invalid');
});

test('invalid upgrade', async t => {
  const { Greeter, Invalid } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(beacon, Greeter, ['Hola mundo!']);
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter, Invalid),
    undefined,
    'Contract `Invalid` is not upgrade safe',
  );
});
