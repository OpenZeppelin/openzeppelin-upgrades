const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.Beacon = await ethers.getContractFactory('Beacon');
});

const IS_NOT_REGISTERED = 'is not registered';
const BEACON_IMPL_UNKNOWN_REGEX = /Beacon's current implementation at \S+ is unknown/;

// These tests need to run before the other deploy beacon tests so that the beacon implementation will not already be in the manifest.

test('block upgrade to unregistered beacon', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.deployed();

  const beacon = await Beacon.deploy(greeter.address);
  await beacon.deployed();

  // upgrade beacon to new impl
  try {
    await upgrades.upgradeBeacon(beacon.address, GreeterV2);
    t.fail('Expected an error due to unregistered deployment');
  } catch (e) {
    t.true(e.message.includes(IS_NOT_REGISTERED), e.message);
  }
});

test('add proxy to unregistered beacon using contract factory', async t => {
  const { Greeter, Beacon } = t.context;

  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.deployed();

  const beacon = await Beacon.deploy(greeter.address);
  await beacon.deployed();

  // add proxy to beacon
  const greeterProxy = await upgrades.deployBeaconProxy(beacon.address, ['Hello, proxy!'], {
    implementation: Greeter,
  });
  t.is(await greeterProxy.greet(), 'Hello, proxy!');
});

test('add proxy to unregistered beacon using signer', async t => {
  const { Greeter, Beacon } = t.context;

  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.deployed();

  const beacon = await Beacon.deploy(greeter.address);
  await beacon.deployed();

  // add proxy to beacon
  try {
    await upgrades.deployBeaconProxy(beacon.address, ['Hello, proxy!'], { signer: Greeter.signer });
    t.fail('Expected an error since beacon ABI cannot be determined');
  } catch (e) {
    t.true(BEACON_IMPL_UNKNOWN_REGEX.test(e.message), e.message);
  }
});
