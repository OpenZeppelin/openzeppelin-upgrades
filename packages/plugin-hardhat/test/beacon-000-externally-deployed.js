import test from 'ava';
import hre from 'hardhat';

const { ethers } = await hre.network.connect();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

import { call } from '@openzeppelin/upgrades-core';


let upgrades;
// let ethers;

test.before(async t => {
  // Initialize upgrades API (needs full HRE)
  upgrades = await upgradesFactory(hre);
  
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

  // call implementation via ethers
  console.log(
    "bytecode",
    await ethers.provider.getCode(await beacon.getAddress())
  )

  console.log( 
    "call beacon implementation function",
    await (await ethers.getContractAt('Beacon', await beacon.getAddress())).implementation()

  );

  call(ethers.provider, await beacon.getAddress(), '0x5c60da1b').then((implAddress) => {
    console.log('TEST2 Implementation address from call:', implAddress);
  });

  /*
    [call] r was returned                   0x0000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3
    TEST2 Implementation address from call: 0x0000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3
  */

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