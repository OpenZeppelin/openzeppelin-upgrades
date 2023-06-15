const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
});

test('happy path - addresses', async t => {
  const { Greeter, GreeterV2, GreeterV3 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat!']);
  await greeter.waitForDeployment();
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeterSecond = await upgrades.deployBeaconProxy(await greeterBeacon.getAddress(), Greeter, [
    'Hello, Hardhat second!',
  ]);
  await greeterSecond.waitForDeployment();
  t.is(await greeterSecond.greet(), 'Hello, Hardhat second!');

  const greeterBeaconDuplicate = await upgrades.deployBeacon(Greeter);
  const greeterThird = await upgrades.deployBeaconProxy(await greeterBeaconDuplicate.getAddress(), Greeter, [
    'Hello, Hardhat third!',
  ]);
  await greeterThird.waitForDeployment();
  t.is(await greeterThird.greet(), 'Hello, Hardhat third!');

  // new impls
  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2);

  await upgrades.upgradeBeacon(await greeterBeaconDuplicate.getAddress(), GreeterV3);

  // reload proxy to work with the new contract
  const greeter2 = GreeterV2.attach(await greeter.getAddress());
  t.is(await greeter2.greet(), 'Hello, Hardhat!');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');

  // reload proxy to work with the new contract
  const greeterSecond2 = GreeterV2.attach(await greeterSecond.getAddress());
  t.is(await greeterSecond2.greet(), 'Hello, Hardhat second!');
  await greeterSecond2.resetGreeting();
  t.is(await greeterSecond2.greet(), 'Hello World');

  // reload proxy to work with the new contract
  const greeterThird2 = GreeterV3.attach(await greeterThird.getAddress());
  t.is(await greeterThird2.greet(), 'Hello, Hardhat third!');
  await greeterThird2.resetGreeting();
  t.is(await greeterThird2.greet(), 'Hello World');
  const version3 = await greeterThird2.version();
  t.is(version3, 'V3');
});
