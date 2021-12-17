const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.Beacon = await ethers.getContractFactory('Beacon');
});

const WAS_NOT_FOUND_IN_MANIFEST = 'was not found in the network manifest';
const BEACON_IMPL_UNKNOWN_REGEX = /Beacon's current implementation at \S+ is unknown/;

// These tests need to run before the other upgrade beacon tests so that the upgraded implementation will not already be in the manifest.

test('deploy proxy using beacon address after external beacon upgrade', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // beacon with impl 1
  const greeterBeacon = await upgrades.deployBeacon(Greeter);

  // external impl 2
  const greeter2 = await GreeterV2.deploy();
  await greeter2.deployed();

  // external upgrade beacon to impl 2
  const beaconContract = Beacon.attach(greeterBeacon.address);
  await beaconContract.upgradeTo(greeter2.address);

  // deploy beacon proxy to attach to beacon (which points to impl 2)
  try {
    await upgrades.deployBeaconProxy(greeterBeacon.address, ['Hello, Hardhat!']);
    t.fail('Expected an error since beacon ABI cannot be determined');
  } catch (e) {
    t.true(BEACON_IMPL_UNKNOWN_REGEX.test(e.message), e.message);
  }
});

test('deploy proxy using proper contract factory after external beacon upgrade', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // beacon with impl 1
  const greeterBeacon = await upgrades.deployBeacon(Greeter);

  // external impl 2
  const greeter2 = await GreeterV2.deploy();
  await greeter2.deployed();

  // external upgrade beacon to impl 2
  const beaconContract = Beacon.attach(greeterBeacon.address);
  await beaconContract.upgradeTo(greeter2.address);

  // deploy beacon proxy to attach to beacon (which points to impl 2)
  const greeterProxy = await upgrades.deployBeaconProxy(greeterBeacon, ['Hello, Hardhat!'], {
    implementation: GreeterV2,
  });
  await greeterProxy.deployed();
  t.is(await greeterProxy.greet(), 'Hello, Hardhat!');
  await greeterProxy.resetGreeting();
  t.is(await greeterProxy.greet(), 'Hello World');
});

test('load proxy with address after external beacon upgrade', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // beacon with impl 1
  const greeterBeacon = await upgrades.deployBeacon(Greeter);

  // deploy beacon proxy to attach to beacon (which points to impl 1)
  const greeterProxy = await upgrades.deployBeaconProxy(greeterBeacon, ['Hello, Hardhat!']);

  // external impl 2
  const greeter2 = await GreeterV2.deploy();
  await greeter2.deployed();

  // external upgrade beacon to impl 2
  const beaconContract = Beacon.attach(greeterBeacon.address);
  await beaconContract.upgradeTo(greeter2.address);

  try {
    await upgrades.loadProxy(greeterProxy.address, greeterProxy.signer);
    t.fail('Expected an error since contract interface cannot be determined');
  } catch (e) {
    t.true(e.message.includes(WAS_NOT_FOUND_IN_MANIFEST), e.message);
  }
});

test('load proxy with contract factory after external beacon upgrade', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // beacon with impl 1
  const greeterBeacon = await upgrades.deployBeacon(Greeter);

  // deploy beacon proxy to attach to beacon (which points to impl 1)
  const greeterProxy = await upgrades.deployBeaconProxy(greeterBeacon, ['Hello, Hardhat!']);

  // external impl 2
  const greeter2 = await GreeterV2.deploy();
  await greeter2.deployed();

  // external upgrade beacon to impl 2
  const beaconContract = Beacon.attach(greeterBeacon.address);
  await beaconContract.upgradeTo(greeter2.address);

  try {
    await upgrades.loadProxy(greeterProxy);
    t.fail('Expected an error since contract interface cannot be determined');
  } catch (e) {
    t.true(e.message.includes(WAS_NOT_FOUND_IN_MANIFEST), e.message);
  }
});

test('manually attach to proxy after external beacon upgrade', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // beacon with impl 1
  const greeterBeacon = await upgrades.deployBeacon(Greeter);

  // deploy beacon proxy to attach to beacon (which points to impl 1)
  const greeterProxy = await upgrades.deployBeaconProxy(greeterBeacon, ['Hello, Hardhat!']);

  // external impl 2
  const greeter2 = await GreeterV2.deploy();
  await greeter2.deployed();

  // external upgrade beacon to impl 2
  const beaconContract = Beacon.attach(greeterBeacon.address);
  await beaconContract.upgradeTo(greeter2.address);

  // manually attach to proxy address
  const manualAttach = GreeterV2.attach(greeterProxy.address);
  t.is(await manualAttach.greet(), 'Hello, Hardhat!');
  await manualAttach.resetGreeting();
  t.is(await manualAttach.greet(), 'Hello World');
});
