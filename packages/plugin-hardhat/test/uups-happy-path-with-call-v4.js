const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('GreeterProxiable40');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2Proxiable40');
});

test('happy path - call with args', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'uups' });

  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.upgradeProxy(greeter, GreeterV2, {
    call: { fn: 'setGreeting', args: ['Called during upgrade'] },
  });

  t.is(await greeter.greet(), 'Called during upgrade');
});

test('happy path - call without args', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'uups' });

  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.upgradeProxy(greeter, GreeterV2, {
    call: 'resetGreeting',
  });

  t.is(await greeter.greet(), 'Hello World');
});
