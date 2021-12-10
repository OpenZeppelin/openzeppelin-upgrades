const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
});

test('happy path', async t => {
  const { Greeter, GreeterV2, GreeterV3 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, ['Hello, Hardhat!']);
  await greeter.deployed();
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeterSecond = await upgrades.deployBeaconProxy(greeterBeacon, ['Hello, Hardhat second!']);
  await greeterSecond.deployed();
  t.is(await greeterSecond.greet(), 'Hello, Hardhat second!');

  // new impl
  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2);

  // reload proxy to work with the new contract
  const greeter2 = await upgrades.loadProxy(greeter);
  t.is(await greeter2.greet(), 'Hello, Hardhat!');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');

  // reload proxy to work with the new contract
  const greeterSecond2 = await upgrades.loadProxy(greeterSecond);
  t.is(await greeterSecond2.greet(), 'Hello, Hardhat second!');
  await greeterSecond2.resetGreeting();
  t.is(await greeterSecond2.greet(), 'Hello World');

  // prepare upgrade from beacon proxy
  const greeter3ImplAddr = await upgrades.prepareUpgrade(greeter.address, GreeterV3);
  const greeter3 = GreeterV3.attach(greeter3ImplAddr);
  const version3 = await greeter3.version();
  t.is(version3, 'V3');

  // prepare upgrade from beacon itself
  const greeter3ImplAddrFromBeacon = await upgrades.prepareUpgrade(greeterBeacon.address, GreeterV3);
  const greeter3FromBeacon = GreeterV3.attach(greeter3ImplAddrFromBeacon);
  const version3FromBeacon = await greeter3FromBeacon.version();
  t.is(version3FromBeacon, 'V3');
});
