const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.WithConstructor = await ethers.getContractFactory('WithConstructor');
});

test('new beacon - do not redeploy with same args', async t => {
  const { WithConstructor } = t.context;

  const beacon1 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.beacon.getImplementationAddress(beacon1.address);
  const proxy1 = await upgrades.deployBeaconProxy(beacon1);
  t.is((await proxy1.value()).toNumber(), 17);

  const beacon2 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation2 = await upgrades.beacon.getImplementationAddress(beacon2.address);
  const proxy2 = await upgrades.deployBeaconProxy(beacon2);
  t.is((await proxy2.value()).toNumber(), 17);

  t.not(beacon1.address, beacon2.address);

  const reloadedProxy1 = await upgrades.loadProxy(proxy1);
  t.is((await reloadedProxy1.value()).toNumber(), 17);

  t.is(implementation1, implementation2);
});

test('new beacon - redeploy with different args', async t => {
  const { WithConstructor } = t.context;

  const beacon1 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.beacon.getImplementationAddress(beacon1.address);
  const proxy1 = await upgrades.deployBeaconProxy(beacon1);
  t.is((await proxy1.value()).toNumber(), 17);

  const beacon2 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [42] });
  const implementation2 = await upgrades.beacon.getImplementationAddress(beacon2.address);
  const proxy2 = await upgrades.deployBeaconProxy(beacon2);
  t.is((await proxy2.value()).toNumber(), 42);

  t.not(beacon1.address, beacon2.address);

  const reloadedProxy1 = await upgrades.loadProxy(proxy1);
  t.is((await reloadedProxy1.value()).toNumber(), 17);

  t.not(implementation1, implementation2);
});

test('upgrade - do not redeploy with same args', async t => {
  const { WithConstructor } = t.context;

  const beacon1 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.beacon.getImplementationAddress(beacon1.address);
  const proxy1 = await upgrades.deployBeaconProxy(beacon1);
  t.is((await proxy1.value()).toNumber(), 17);

  const beacon2 = await upgrades.upgradeBeacon(beacon1, WithConstructor, { constructorArgs: [17] });
  const implementation2 = await upgrades.beacon.getImplementationAddress(beacon2.address);
  const proxy2 = await upgrades.deployBeaconProxy(beacon2);
  t.is((await proxy2.value()).toNumber(), 17);

  t.is(beacon1.address, beacon2.address);

  const reloadedProxy1 = await upgrades.loadProxy(proxy1);
  t.is((await reloadedProxy1.value()).toNumber(), 17);

  t.is(implementation1, implementation2);
});

test('upgrade - redeploy with different args', async t => {
  const { WithConstructor } = t.context;

  const beacon1 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.beacon.getImplementationAddress(beacon1.address);
  const proxy1 = await upgrades.deployBeaconProxy(beacon1);
  t.is((await proxy1.value()).toNumber(), 17);

  const beacon2 = await upgrades.upgradeBeacon(beacon1, WithConstructor, { constructorArgs: [42] });
  const implementation2 = await upgrades.beacon.getImplementationAddress(beacon2.address);
  const proxy2 = await upgrades.deployBeaconProxy(beacon2);
  t.is((await proxy2.value()).toNumber(), 42);

  t.is(beacon1.address, beacon2.address);

  const reloadedProxy1 = await upgrades.loadProxy(proxy1);
  t.is((await reloadedProxy1.value()).toNumber(), 42);

  t.not(implementation1, implementation2);
});
