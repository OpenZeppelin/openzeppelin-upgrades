const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.WithConstructor = await ethers.getContractFactory('WithConstructor');
});

test('do not redeploy with same args', async t => {
  const { WithConstructor } = t.context;

  const instance1 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [ 17 ]});
  const instance2 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [ 17 ]});

  const implementation1 = await upgrades.erc1967.getImplementationAddress(instance1.address)
  const implementation2 = await upgrades.erc1967.getImplementationAddress(instance2.address)

  t.is(implementation1, implementation2);
});

test('redeploy with different args', async t => {
  const { WithConstructor } = t.context;

  const instance1 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [ 17 ]});
  const instance2 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [ 42 ]});

  const implementation1 = await upgrades.erc1967.getImplementationAddress(instance1.address)
  const implementation2 = await upgrades.erc1967.getImplementationAddress(instance2.address)

  t.not(implementation1, implementation2);
});
