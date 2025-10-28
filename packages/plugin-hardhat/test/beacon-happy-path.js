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
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
});

test('happy path', async t => {
  const { Greeter, GreeterV2, GreeterV3 } = t.context;

  const greeterBeacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat!']);
  await greeter.waitForDeployment();
  t.is(await greeter.greet(), 'Hello, Hardhat!');

  const greeterSecond = await upgrades.deployBeaconProxy(greeterBeacon, Greeter, ['Hello, Hardhat second!']);
  await greeterSecond.waitForDeployment();
  t.is(await greeterSecond.greet(), 'Hello, Hardhat second!');

  // new impl
  await upgrades.upgradeBeacon(greeterBeacon, GreeterV2);

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

  // prepare upgrade from beacon proxy
  const greeter3ImplAddr = await upgrades.prepareUpgrade(await greeter.getAddress(), GreeterV3);
  const greeter3 = GreeterV3.attach(greeter3ImplAddr);
  const version3 = await greeter3.version();
  t.is(version3, 'V3');

  // prepare upgrade from beacon itself
  const greeter3ImplAddrFromBeacon = await upgrades.prepareUpgrade(await greeterBeacon.getAddress(), GreeterV3);
  const greeter3FromBeacon = GreeterV3.attach(greeter3ImplAddrFromBeacon);
  const version3FromBeacon = await greeter3FromBeacon.version();
  t.is(version3FromBeacon, 'V3');
});
