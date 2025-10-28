import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

const { ethers } = connection;
let upgrades;

test.before(async t => {
  // Initialize upgrades API (needs full HRE)
  upgrades = await upgradesFactory(hre, connection);
  
  // Now get contract factories
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.Beacon = await ethers.getContractFactory('Beacon');
});

const IS_NOT_REGISTERED = 'is not registered';

test('block upgrade to unregistered beacon', async t => {
  const { Greeter, GreeterV2, Beacon } = t.context;
  
  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.waitForDeployment();

  console.log('Deployed Greeter at:', await greeter.getAddress());

  // upgrades.deployBeacon()
  const beacon = await Beacon.deploy(await greeter.getAddress());
  await beacon.waitForDeployment();

  console.log('Deployed Beacon at:', await beacon.getAddress());

  // upgrade beacon to new impl
  try {
    await upgrades.upgradeBeacon(await beacon.getAddress(), GreeterV2);
    t.fail('Expected an error due to unregistered deployment');
  } catch (e) {
    console.log('Upgrade error message:', e.message);
    t.true(e.message.includes(IS_NOT_REGISTERED), e.message);
  }
});

test('add proxy to unregistered beacon using contract factory', async t => {
  const { Greeter, Beacon } = t.context;
  
  // deploy beacon without upgrades plugin
  const greeter = await Greeter.deploy();
  await greeter.waitForDeployment();
  const beacon = await Beacon.deploy(await greeter.getAddress());
  await beacon.waitForDeployment();
  
  // add proxy to beacon
  const greeterProxy = await upgrades.deployBeaconProxy(await beacon.getAddress(), Greeter, ['Hello, proxy!'], {
    implementation: Greeter,
  });
  t.is(await greeterProxy.greet(), 'Hello, proxy!');
});