import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
});

test('happy path', async t => {
  const beacon = await upgrades.deployBeacon('Greeter');
  t.true(beacon.address.startsWith('0x'));

  const greeter = await upgrades.deployBeaconProxy(beacon, 'Greeter', ['Hello, Hardhat!']);
  t.is(await greeter.read.greet(), 'Hello, Hardhat!');

  // The implementation reported by the beacon matches the getters
  const implAddress = await upgrades.beacon.getImplementationAddress(beacon.address);
  t.is(await beacon.read.implementation(), implAddress);
  t.is(await upgrades.erc1967.getBeaconAddress(greeter.address), beacon.address);

  const upgradedBeacon = await upgrades.upgradeBeacon(beacon, 'contracts/GreeterV2.sol:GreeterV2');
  t.is(upgradedBeacon.address, beacon.address);

  const newImplAddress = await upgrades.beacon.getImplementationAddress(beacon.address);
  t.not(newImplAddress, implAddress);

  const greeter2 = await connection.viem.getContractAt('contracts/GreeterV2.sol:GreeterV2', greeter.address);
  // The greeting set before the upgrade is preserved, matching the ethers beacon happy path.
  t.is(await greeter2.read.greet(), 'Hello, Hardhat!');
  await greeter2.write.resetGreeting();
  t.is(await greeter2.read.greet(), 'Hello World');
});

test('deployBeaconProxy with beacon address and options overload', async t => {
  const beacon = await upgrades.deployBeacon('Greeter');

  // args omitted: Greeter's initialize is not required to be called
  const greeter = await upgrades.deployBeaconProxy(beacon.address, 'Greeter', { initializer: false });
  t.is(await greeter.read.greet(), '');
});

test('upgradeableBeaconAbi matches the UpgradeableBeacon artifact', async t => {
  // The const ABI exists for typing; it must stay in sync with the artifact that deployBeacon deploys
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const artifact = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json');
  const { upgradeableBeaconAbi } = await import('@openzeppelin/hardhat-upgrades/viem');
  t.deepEqual(JSON.parse(JSON.stringify(upgradeableBeaconAbi)), artifact.abi);
});
