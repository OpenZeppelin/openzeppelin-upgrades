import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;


test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test('call with args', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat!']);

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
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat!']);

  t.is(await greeter.greet(), 'Hello, Hardhat!');

  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2, {
    call: 'resetGreeting',
  });
  // the above call does nothing useful since beacon upgrades do not use that option

  t.is(await greeter.greet(), 'Hello, Hardhat!');
});
