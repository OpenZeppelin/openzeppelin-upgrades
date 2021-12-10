const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test('call with args', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, ['Hello, Hardhat!']);

  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2, {
    call: { fn: 'setGreeting', args: ['Called during upgrade'] },
  });
  // the above call does nothing useful since beacon upgrades do not use that option

  t.is(await greeter.greet(), 'Hello, Hardhat!');
});

test('call without args', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, ['Hello, Hardhat!']);

  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2, {
    call: 'resetGreeting',
  });
  // the above call does nothing useful since beacon upgrades do not use that option

  t.is(await greeter.greet(), 'Hello, Hardhat!');
});
