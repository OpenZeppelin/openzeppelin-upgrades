const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable');
  t.context.Invalid = await ethers.getContractFactory('InvalidProxiable');
});

test('invalid upgrade', async t => {
  const { Greeter, Invalid } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'uups' });
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter, Invalid),
    undefined,
    'Contract `Invalid` is not upgrade safe',
  );
});
