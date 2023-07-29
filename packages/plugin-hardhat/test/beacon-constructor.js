const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.WithConstructor = await ethers.getContractFactory('WithConstructor');
});

test('new beacon - do not redeploy with same args', async t => {
  const { WithConstructor } = t.context;

  const beacon1 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.beacon.getImplementationAddress(await beacon1.getAddress());
  const proxy1 = await upgrades.deployBeaconProxy(beacon1, WithConstructor);
  t.is(await proxy1.value(), 17n);

  const beacon2 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation2 = await upgrades.beacon.getImplementationAddress(await beacon2.getAddress());
  const proxy2 = await upgrades.deployBeaconProxy(beacon2, WithConstructor);
  t.is(await proxy2.value(), 17n);

  t.not(await beacon1.getAddress(), await beacon2.getAddress());

  const reloadedProxy1 = WithConstructor.attach(await proxy1.getAddress());
  t.is(await reloadedProxy1.value(), 17n);

  t.is(implementation1, implementation2);
});

test('new beacon - redeploy with different args', async t => {
  const { WithConstructor } = t.context;

  const beacon1 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.beacon.getImplementationAddress(await beacon1.getAddress());
  const proxy1 = await upgrades.deployBeaconProxy(beacon1, WithConstructor);
  t.is(await proxy1.value(), 17n);

  const beacon2 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [42] });
  const implementation2 = await upgrades.beacon.getImplementationAddress(await beacon2.getAddress());
  const proxy2 = await upgrades.deployBeaconProxy(beacon2, WithConstructor);
  t.is(await proxy2.value(), 42n);

  t.not(await beacon1.getAddress(), await beacon2.getAddress());

  const reloadedProxy1 = WithConstructor.attach(await proxy1.getAddress());
  t.is(await reloadedProxy1.value(), 17n);

  t.not(implementation1, implementation2);
});

test('upgrade - do not redeploy with same args', async t => {
  const { WithConstructor } = t.context;

  const beacon1 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.beacon.getImplementationAddress(await beacon1.getAddress());
  const proxy1 = await upgrades.deployBeaconProxy(beacon1, WithConstructor);
  t.is(await proxy1.value(), 17n);

  const beacon2 = await upgrades.upgradeBeacon(beacon1, WithConstructor, { constructorArgs: [17] });
  const implementation2 = await upgrades.beacon.getImplementationAddress(await beacon2.getAddress());
  const proxy2 = await upgrades.deployBeaconProxy(beacon2, WithConstructor);
  t.is(await proxy2.value(), 17n);

  t.is(await beacon1.getAddress(), await beacon2.getAddress());

  const reloadedProxy1 = WithConstructor.attach(await proxy1.getAddress());
  t.is(await reloadedProxy1.value(), 17n);

  t.is(implementation1, implementation2);
});

test('upgrade - redeploy with different args', async t => {
  const { WithConstructor } = t.context;

  const beacon1 = await upgrades.deployBeacon(WithConstructor, { constructorArgs: [17] });
  const implementation1 = await upgrades.beacon.getImplementationAddress(await beacon1.getAddress());
  const proxy1 = await upgrades.deployBeaconProxy(beacon1, WithConstructor);
  t.is(await proxy1.value(), 17n);

  const beacon2 = await upgrades.upgradeBeacon(beacon1, WithConstructor, { constructorArgs: [42] });
  const implementation2 = await upgrades.beacon.getImplementationAddress(await beacon2.getAddress());
  const proxy2 = await upgrades.deployBeaconProxy(beacon2, WithConstructor);
  t.is(await proxy2.value(), 42n);

  t.is(await beacon1.getAddress(), await beacon2.getAddress());

  const reloadedProxy1 = WithConstructor.attach(await proxy1.getAddress());
  t.is(await reloadedProxy1.value(), 42n);

  t.not(implementation1, implementation2);
});
