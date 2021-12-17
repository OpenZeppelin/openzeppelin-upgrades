const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.DeployOverload = await ethers.getContractFactory('DeployOverload');
});

test('no args', async t => {
  const beacon = await upgrades.deployBeacon(t.context.DeployOverload);
  const c = await upgrades.deployBeaconProxy(beacon, {
    kind: 'beacon',
    initializer: 'customInitialize',
  });
  t.is((await c.value()).toString(), '42');
});
