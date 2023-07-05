const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.Beacon = await ethers.getContractFactory('Beacon');
});

const IS_NOT_REGISTERED = 'is not registered';

// These tests need to run before the other deploy beacon tests so that the beacon implementation will not already be in the manifest.

test('block upgrade to unregistered beacon', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.waitForDeployment();

  const beacon = await Beacon.deploy(await greeter.getAddress());
  await beacon.waitForDeployment();

  // upgrade beacon to new impl
  try {
    await upgrades.upgradeBeacon(await beacon.getAddress(), GreeterV2);
    t.fail('Expected an error due to unregistered deployment');
  } catch (e) {
    t.true(e.message.includes(IS_NOT_REGISTERED), e.message);
  }
});

test('add proxy to unregistered beacon using contract factory', async t => {
  const { Greeter, Beacon } = t.context;

  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.waitForDeployment();

  const beacon = await Beacon.deploy(await greeter.getAddress());
  await beacon.waitForDeployment();

  // add proxy to beacon
  const greeterProxy = await upgrades.deployBeaconProxy(await beacon.getAddress(), Greeter, ['Hello, proxy!'], {
    implementation: Greeter,
  });
  t.is(await greeterProxy.greet(), 'Hello, proxy!');
});
