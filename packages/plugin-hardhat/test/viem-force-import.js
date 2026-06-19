import test from 'ava';
import hre from 'hardhat';
import { createRequire } from 'node:module';
import { encodeFunctionData, getAddress } from 'viem';

const require = createRequire(import.meta.url);

const ERC1967Proxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json');
const UpgradeableBeacon = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json');

const connection = await hre.network.create();
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

let upgrades;
let publicClient;
let walletClient;

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
  publicClient = await connection.viem.getPublicClient();
  [walletClient] = await connection.viem.getWalletClients();
});

async function deployRaw(artifact, args = []) {
  const hash = await walletClient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return getAddress(receipt.contractAddress);
}

test('import proxy', async t => {
  // Deploy a proxy without the plugin, so that it is not in the manifest
  const impl = await connection.viem.deployContract('contracts/Greeter.sol:GreeterProxiable');
  const initData = encodeFunctionData({ abi: impl.abi, functionName: 'initialize', args: ['Hello'] });
  const proxyAddress = await deployRaw(ERC1967Proxy, [impl.address, initData]);

  const imported = await upgrades.forceImport(proxyAddress, 'contracts/Greeter.sol:GreeterProxiable');
  t.is(imported.address, proxyAddress);
  t.is(await imported.read.greet(), 'Hello');

  // With an account available, the returned instance is writable, not just readable.
  await imported.write.setGreeting(['Hi from the imported proxy']);
  t.is(await imported.read.greet(), 'Hi from the imported proxy');

  // The imported proxy can then be upgraded with the plugin
  const greeter2 = await upgrades.upgradeProxy(proxyAddress, 'contracts/GreeterV2.sol:GreeterV2Proxiable');
  await greeter2.write.resetGreeting();
  t.is(await greeter2.read.greet(), 'Hello World');
});

test('import beacon', async t => {
  // Deploy a beacon without the plugin, so that it is not in the manifest
  const impl = await connection.viem.deployContract('Greeter');
  const beaconAddress = await deployRaw(UpgradeableBeacon, [impl.address, walletClient.account.address]);

  const importedBeacon = await upgrades.forceImport(beaconAddress, 'Greeter');
  t.is(importedBeacon.address, beaconAddress);
  // The returned instance is the beacon contract itself
  t.is(
    await importedBeacon.read.implementation(),
    await upgrades.beacon.getImplementationAddress(beaconAddress),
  );

  // The imported beacon can then be upgraded with the plugin
  const upgradedBeacon = await upgrades.upgradeBeacon(beaconAddress, 'contracts/GreeterV2.sol:GreeterV2');
  t.is(upgradedBeacon.address, beaconAddress);
});

test('import implementation', async t => {
  // Deploy an implementation without the plugin, so that it is not in the manifest
  const impl = await connection.viem.deployContract('GreeterV3Proxiable');

  // A viem contract instance can be passed in place of the address
  const imported = await upgrades.forceImport(impl, 'GreeterV3Proxiable');
  t.is(imported.address, getAddress(impl.address));
  t.is(await imported.read.version(), 'V3');
});
