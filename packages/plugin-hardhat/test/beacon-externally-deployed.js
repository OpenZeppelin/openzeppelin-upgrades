const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.Beacon = await ethers.getContractFactory('Beacon');
});

test('block upgrade to unregistered beacon', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.deployed();
  greeter.initialize('Hello, Hardhat!');

  const beacon = await Beacon.deploy(greeter.address);
  await beacon.deployed();

  // upgrade beacon to new impl
  try {
    await upgrades.upgradeBeacon(beacon.address, GreeterV2);
    t.fail('Expected an error due to unregistered deployment');
  } catch (e) {
    // expected error
  }
});

test('add proxy to unregistered beacon using contract factory', async t => {
  const { Greeter, Beacon } = t.context;

  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.deployed();
  greeter.initialize('Hello, Hardhat!');

  const beacon = await Beacon.deploy(greeter.address);
  await beacon.deployed();

  // add proxy to beacon
  const greeterProxy = await upgrades.deployBeaconProxy(beacon.address, Greeter, ['Hello, proxy!']);
  t.is(await greeterProxy.greet(), 'Hello, proxy!');
});

test('add proxy to unregistered beacon using signer', async t => {
  const { Greeter, Beacon } = t.context;

  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.deployed();
  greeter.initialize('Hello, Hardhat!');

  const beacon = await Beacon.deploy(greeter.address);
  await beacon.deployed();

  // add proxy to beacon
  try {
    await upgrades.deployBeaconProxy(beacon.address, Greeter.signer, ['Hello, proxy!']);
    t.fail('Expected an error since beacon ABI cannot be determined');
  } catch (e) {
    // expected error
  }
});
