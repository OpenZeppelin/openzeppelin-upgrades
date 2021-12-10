const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
});

test('happy path - addresses and signers', async t => {
  const { Greeter, GreeterV2, GreeterV3 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, ['Hello, Hardhat!'], { signer: Greeter.signer });
  await greeter.deployed();
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeterSecond = await upgrades.deployBeaconProxy(greeterBeacon.address, ['Hello, Hardhat second!'], {
    implementation: Greeter,
  });
  await greeterSecond.deployed();
  t.is(await greeterSecond.greet(), 'Hello, Hardhat second!');

  const greeterBeaconDuplicate = await upgrades.deployBeacon(Greeter);
  const greeterThird = await upgrades.deployBeaconProxy(greeterBeaconDuplicate.address, ['Hello, Hardhat third!'], {
    signer: Greeter.signer,
  });
  await greeterThird.deployed();
  t.is(await greeterThird.greet(), 'Hello, Hardhat third!');

  // new impls
  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2);

  await upgrades.upgradeBeacon(greeterBeaconDuplicate.address, GreeterV3);

  // reload proxy to work with the new contract
  const greeter2 = await upgrades.loadProxy(greeter);
  t.is(await greeter2.greet(), 'Hello, Hardhat!');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');

  // reload proxy to work with the new contract
  const greeterSecond2 = await upgrades.loadProxy(greeterSecond.address, greeterSecond.signer);
  t.is(await greeterSecond2.greet(), 'Hello, Hardhat second!');
  await greeterSecond2.resetGreeting();
  t.is(await greeterSecond2.greet(), 'Hello World');

  // reload proxy to work with the new contract
  const greeterThird2 = await upgrades.loadProxy(greeterThird, greeterThird.signer);
  t.is(await greeterThird2.greet(), 'Hello, Hardhat third!');
  await greeterThird2.resetGreeting();
  t.is(await greeterThird2.greet(), 'Hello World');
  const version3 = await greeterThird2.version();
  t.is(version3, 'V3');
});
