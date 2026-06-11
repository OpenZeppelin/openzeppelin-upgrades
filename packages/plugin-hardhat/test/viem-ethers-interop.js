import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.create();
const { ethers } = connection;
import { upgrades as ethersUpgradesFactory } from '@openzeppelin/hardhat-upgrades';
import { upgrades as viemUpgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

// The ethers-based and viem-based APIs share the same network manifest and validation data,
// so proxies deployed with one API can be upgraded with the other, e.g. when a project
// migrates from ethers to viem. These tests cover both directions, including that upgrade
// safety validations apply against the storage layout recorded by the other API.

let ethersUpgrades;
let viemUpgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async t => {
  ethersUpgrades = await ethersUpgradesFactory(hre, connection);
  viemUpgrades = await viemUpgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2Proxiable = await ethers.getContractFactory('contracts/GreeterV2.sol:GreeterV2Proxiable');
  t.context.GreeterStorageConflict = await ethers.getContractFactory('GreeterStorageConflict');
});

test('deploy transparent proxy with ethers, upgrade it with viem', async t => {
  const { Greeter } = t.context;

  const greeter = await ethersUpgrades.deployProxy(Greeter, ['Hello from ethers'], { kind: 'transparent' });
  const proxyAddress = await greeter.getAddress();

  const greeter2 = await viemUpgrades.upgradeProxy(proxyAddress, 'contracts/GreeterV2.sol:GreeterV2');
  t.is(greeter2.address, proxyAddress);

  // State is preserved and the new implementation works
  t.is(await greeter2.read.greet(), 'Hello from ethers');
  await greeter2.write.resetGreeting();
  t.is(await greeter2.read.greet(), 'Hello World');
});

test('deploy uups proxy with viem, upgrade it with ethers', async t => {
  const { GreeterV2Proxiable } = t.context;

  const greeter = await viemUpgrades.deployProxy('contracts/Greeter.sol:GreeterProxiable', ['Hello from viem'], {
    kind: 'uups',
  });

  const greeter2 = await ethersUpgrades.upgradeProxy(greeter.address, GreeterV2Proxiable);
  await greeter2.waitForDeployment();
  t.is(await greeter2.getAddress(), greeter.address);

  // State is preserved and the new implementation works
  t.is(await greeter2.greet(), 'Hello from viem');
  await greeter2.resetGreeting();
  t.is(await greeter2.greet(), 'Hello World');
});

test('deploy beacon with ethers, upgrade it with viem', async t => {
  const { Greeter } = t.context;

  const beacon = await ethersUpgrades.deployBeacon(Greeter);
  const beaconAddress = await beacon.getAddress();

  const greeter = await viemUpgrades.deployBeaconProxy(beaconAddress, 'Greeter', ['Hello from ethers']);
  t.is(await greeter.read.greet(), 'Hello from ethers');

  await viemUpgrades.upgradeBeacon(beaconAddress, 'contracts/GreeterV2.sol:GreeterV2');

  const greeter2 = await connection.viem.getContractAt('contracts/GreeterV2.sol:GreeterV2', greeter.address);
  await greeter2.write.resetGreeting();
  t.is(await greeter2.read.greet(), 'Hello World');
});

test('incompatible storage when upgrading with viem a proxy deployed with ethers', async t => {
  const { Greeter } = t.context;

  const greeter = await ethersUpgrades.deployProxy(Greeter, ['Hola mundo!'], { kind: 'transparent' });

  // GreeterStorageConflict inserts a new variable before the existing one, which must fail
  // the storage layout check against the layout recorded by the ethers-based deployment
  await t.throwsAsync(viemUpgrades.upgradeProxy(await greeter.getAddress(), 'GreeterStorageConflict'), {
    message: /New storage layout is incompatible/,
  });
});

test('incompatible storage when upgrading with ethers a proxy deployed with viem', async t => {
  const { GreeterStorageConflict } = t.context;

  const greeter = await viemUpgrades.deployProxy('Greeter', ['Hola mundo!'], { kind: 'transparent' });

  await t.throwsAsync(ethersUpgrades.upgradeProxy(greeter.address, GreeterStorageConflict), {
    message: /New storage layout is incompatible/,
  });
});

test('incompatible storage when upgrading a viem-deployed uups proxy with viem', async t => {
  const greeter = await viemUpgrades.deployProxy('contracts/Greeter.sol:GreeterProxiable', ['Hola mundo!'], {
    kind: 'uups',
  });

  await t.throwsAsync(viemUpgrades.upgradeProxy(greeter, 'GreeterStorageConflictProxiable'), {
    message: /New storage layout is incompatible/,
  });

  // The check can be explicitly skipped, mirroring the ethers-based API
  await t.notThrowsAsync(
    viemUpgrades.upgradeProxy(greeter, 'GreeterStorageConflictProxiable', { unsafeSkipStorageCheck: true }),
  );
});
