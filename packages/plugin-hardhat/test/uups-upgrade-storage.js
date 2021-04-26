const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterStorageConflict = await ethers.getContractFactory('GreeterStorageConflictProxiable');
});

test('incompatible storage', async t => {
  const { Greeter, GreeterStorageConflict } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter.address, GreeterStorageConflict),
    undefined,
    'New storage layout is incompatible due to the following changes',
  );
});
