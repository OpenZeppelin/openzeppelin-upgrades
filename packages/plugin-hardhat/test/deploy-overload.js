const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.DeployOverload = await ethers.getContractFactory('DeployOverload');
});

test('no args', async t => {
  const c = await upgrades.deployProxy(t.context.DeployOverload, { initializer: 'customInitialize' });
  t.is((await c.value()).toString(), '42');
});
