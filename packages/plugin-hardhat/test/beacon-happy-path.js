const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test('happy path', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter); 
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat!']);
  await greeter.deployed();
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeterSecond = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat second!']);
  await greeterSecond.deployed();
  t.is(await greeterSecond.greet(), 'Hello, Hardhat second!');

  // new impl 
  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2);  

  // reload proxy to work with the new contract
  const greeter2 = await upgrades.reloadBeaconProxy(greeter);
  t.is(await greeter2.greet(), 'Hello, Hardhat!');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');

  // reload proxy to work with the new contract
  const greeterSecond2 = await upgrades.reloadBeaconProxy(greeterSecond);
  t.is(await greeterSecond2.greet(), 'Hello, Hardhat second!');
  await greeterSecond2.resetGreeting();
  t.is(await greeterSecond2.greet(), 'Hello World');
});
