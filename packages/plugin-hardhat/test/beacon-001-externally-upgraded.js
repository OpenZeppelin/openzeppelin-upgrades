const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.Beacon = await ethers.getContractFactory('Beacon');
});

// These tests need to run before the other upgrade beacon tests so that the upgraded implementation will not already be in the manifest.

test('deploy proxy using proper contract factory after external beacon upgrade', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // beacon with impl 1
  const greeterBeacon = await upgrades.deployBeacon(Greeter);

  // external impl 2
  const greeter2 = await GreeterV2.deploy();
  await greeter2.waitForDeployment();

  // external upgrade beacon to impl 2
  const beaconContract = Beacon.attach(await greeterBeacon.getAddress());
  await beaconContract.upgradeTo(await greeter2.getAddress());

  // deploy beacon proxy to attach to beacon (which points to impl 2)
  const greeterProxy = await upgrades.deployBeaconProxy(greeterBeacon, GreeterV2, ['Hello, Hardhat!'], {
    implementation: GreeterV2,
  });
  await greeterProxy.waitForDeployment();
  t.is(await greeterProxy.greet(), 'Hello, Hardhat!');
  await greeterProxy.resetGreeting();
  t.is(await greeterProxy.greet(), 'Hello World');
});

test('manually attach to proxy after external beacon upgrade', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;

  // beacon with impl 1
  const greeterBeacon = await upgrades.deployBeacon(Greeter);

  // deploy beacon proxy to attach to beacon (which points to impl 1)
  const greeterProxy = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat!']);

  // external impl 2
  const greeter2 = await GreeterV2.deploy();
  await greeter2.waitForDeployment();

  // external upgrade beacon to impl 2
  const beaconContract = Beacon.attach(await greeterBeacon.getAddress());
  await beaconContract.upgradeTo(await greeter2.getAddress());

  // manually attach to proxy address
  const manualAttach = GreeterV2.attach(await greeterProxy.getAddress());
  t.is(await manualAttach.greet(), 'Hello, Hardhat!');
  await manualAttach.resetGreeting();
  t.is(await manualAttach.greet(), 'Hello World');
});
