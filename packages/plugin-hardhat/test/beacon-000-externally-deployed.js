import test from 'ava';
import hre from 'hardhat';
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;
let ethers;

test.before(async t => {
  // Initialize upgrades API (needs full HRE)
  upgrades = await upgradesFactory(hre);
  
  // Get ethers from network connection (Hardhat 3 way)
  const connection = await hre.network.connect();
  ethers = connection.ethers;
  
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

  // upgrades.deployBeacon()
  const beacon = await Beacon.deploy(await greeter.getAddress());
  await beacon.waitForDeployment();
  
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