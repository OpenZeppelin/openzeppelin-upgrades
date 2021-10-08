const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.WithConstructor = await ethers.getContractFactory('WithConstructor');
});

test('new proxy - do not redeploy with same args', async t => {
  const { WithConstructor } = t.context;

  const proxy1 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.erc1967.getImplementationAddress(proxy1.address);

  const proxy2 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [17] });
  const implementation2 = await upgrades.erc1967.getImplementationAddress(proxy2.address);

  t.is(implementation1, implementation2);
});

test('new proxy - redeploy with different args', async t => {
  const { WithConstructor } = t.context;

  const proxy1 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.erc1967.getImplementationAddress(proxy1.address);

  const proxy2 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [42] });
  const implementation2 = await upgrades.erc1967.getImplementationAddress(proxy2.address);

  t.not(implementation1, implementation2);
});

test('upgrade - do not redeploy with same args', async t => {
  const { WithConstructor } = t.context;

  const proxy1 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.erc1967.getImplementationAddress(proxy1.address);

  const proxy2 = await upgrades.upgradeProxy(proxy1, WithConstructor, { constructorArgs: [17] });
  const implementation2 = await upgrades.erc1967.getImplementationAddress(proxy2.address);

  t.is(implementation1, implementation2);
});

test('upgrade - redeploy with different args', async t => {
  const { WithConstructor } = t.context;

  const proxy1 = await upgrades.deployProxy(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.erc1967.getImplementationAddress(proxy1.address);

  const proxy2 = await upgrades.upgradeProxy(proxy1, WithConstructor, { constructorArgs: [42] });
  const implementation2 = await upgrades.erc1967.getImplementationAddress(proxy2.address);

  t.not(implementation1, implementation2);
});
