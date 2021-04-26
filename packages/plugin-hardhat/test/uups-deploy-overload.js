const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.DeployOverload = await ethers.getContractFactory('DeployOverloadProxiable');
});

test('no args', async t => {
  const c = await upgrades.deployProxy(t.context.DeployOverload, {
    kind: 'uups',
    initializer: 'customInitialize',
  });
  t.is((await c.value()).toString(), '42');
});
