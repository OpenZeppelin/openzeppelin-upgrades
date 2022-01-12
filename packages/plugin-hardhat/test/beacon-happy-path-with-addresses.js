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
  await greeter.deployed();
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeterSecond = await upgrades.deployBeaconProxy(greeterBeacon.address, Greeter, ['Hello, Hardhat second!']);
  await greeterSecond.deployed();
  t.is(await greeterSecond.greet(), 'Hello, Hardhat second!');

  const greeterBeaconDuplicate = await upgrades.deployBeacon(Greeter);
  const greeterThird = await upgrades.deployBeaconProxy(greeterBeaconDuplicate.address, Greeter, [
    'Hello, Hardhat third!',
  ]);
  await greeterThird.deployed();
  t.is(await greeterThird.greet(), 'Hello, Hardhat third!');

  // new impls
  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2);

  await upgrades.upgradeBeacon(greeterBeaconDuplicate.address, GreeterV3);

  // reload proxy to work with the new contract
  const greeter2 = GreeterV2.attach(greeter.address);
  t.is(await greeter2.greet(), 'Hello, Hardhat!');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');

  // reload proxy to work with the new contract
  const greeterSecond2 = GreeterV2.attach(greeterSecond.address);
  t.is(await greeterSecond2.greet(), 'Hello, Hardhat second!');
  await greeterSecond2.resetGreeting();
  t.is(await greeterSecond2.greet(), 'Hello World');

  // reload proxy to work with the new contract
  const greeterThird2 = GreeterV3.attach(greeterThird.address);
  t.is(await greeterThird2.greet(), 'Hello, Hardhat third!');
  await greeterThird2.resetGreeting();
  t.is(await greeterThird2.greet(), 'Hello World');
  const version3 = await greeterThird2.version();
  t.is(version3, 'V3');
});
