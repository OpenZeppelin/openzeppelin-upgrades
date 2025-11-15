import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  
  t.context.InitializerOverloaded = await ethers.getContractFactory('InitializerOverloaded');
  t.context.InitializerMissing = await ethers.getContractFactory('InitializerMissing');
});

test('multiple matching functions', async t => {
  const { InitializerOverloaded } = t.context;
  const beacon = await upgrades.deployBeacon(InitializerOverloaded);
  await t.throwsAsync(
    () => upgrades.deployBeaconProxy(beacon, InitializerOverloaded, [42]),
    undefined,
    'multiple matching functions',
  );
});

test('unique function selector', async t => {
  const { InitializerOverloaded } = t.context;
  const beacon = await upgrades.deployBeacon(InitializerOverloaded);
  const instance = await upgrades.deployBeaconProxy(beacon, InitializerOverloaded, [42], {
    kind: 'beacon',
    initializer: 'initialize(uint256)',
  });
  t.is((await instance.x()).toString(), '42');
});

test('no initialize function and no args', async t => {
  const { InitializerMissing } = t.context;
  const beacon = await upgrades.deployBeacon(InitializerMissing);
  await upgrades.deployBeaconProxy(beacon, InitializerMissing);
});

test('no initialize function and explicit args', async t => {
  const { InitializerMissing } = t.context;
  const beacon = await upgrades.deployBeacon(InitializerMissing);
  await t.throwsAsync(
    () => upgrades.deployBeaconProxy(beacon, InitializerMissing, [42]),
    undefined,
    'no matching function',
  );
});
