import test from 'ava';
import hre from 'hardhat';
import { createRequire } from 'node:module';
import { encodeDeployData, encodeFunctionData, getAddress } from 'viem';

const require = createRequire(import.meta.url);
const ERC1967Proxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json');
const UpgradeableBeacon = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts-v5/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.json');

// A connection with no configured accounts: `connection.viem.getWalletClients()` is empty. This is
// the read-only-connection scenario forceImport must support — the contract exists on-chain, but
// the connection cannot sign. Importing must still record the deployment and return a read-capable
// instance, matching the ethers-based API (which attaches without a signer).
const connection = await hre.network.create({ override: { accounts: [] } });
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades/viem';

let upgrades;
let publicClient;

// An ordinary address (not derived from any private key): the dev node funds and impersonates it,
// so the contracts to import can be deployed without configuring or hardcoding a signing key.
const deployer = getAddress('0x1234567890123456789012345678901234567890');

test.after.always(async () => {
  await connection.close();
});

test.before(async () => {
  upgrades = await upgradesFactory(hre, connection);
  publicClient = await connection.viem.getPublicClient();
  await connection.provider.request({ method: 'hardhat_setBalance', params: [deployer, '0x56BC75E2D63100000'] });
  await connection.provider.request({ method: 'hardhat_impersonateAccount', params: [deployer] });
});

async function deploy(artifact, args = []) {
  const data = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    ...(args.length > 0 ? { args } : {}),
  });
  const hash = await connection.provider.request({ method: 'eth_sendTransaction', params: [{ from: deployer, data }] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return getAddress(receipt.contractAddress);
}

test('import proxy on a connection without accounts returns a read-capable instance', async t => {
  t.is((await connection.viem.getWalletClients()).length, 0);

  const implArtifact = await hre.artifacts.readArtifact('contracts/Greeter.sol:GreeterProxiable');
  const implAddress = await deploy(implArtifact);
  const initData = encodeFunctionData({ abi: implArtifact.abi, functionName: 'initialize', args: ['Hello'] });
  const proxyAddress = await deploy(ERC1967Proxy, [implAddress, initData]);

  // forceImport records the deployment without needing an account, and returns a read-capable
  // instance. The returned object is then usable for reads.
  const imported = await upgrades.forceImport(proxyAddress, 'contracts/Greeter.sol:GreeterProxiable');
  t.is(imported.address, proxyAddress);
  t.is(await imported.read.greet(), 'Hello');
});

test('import beacon on a connection without accounts returns a read-capable beacon instance', async t => {
  const implArtifact = await hre.artifacts.readArtifact('Greeter');
  const implAddress = await deploy(implArtifact);
  const beaconAddress = await deploy(UpgradeableBeacon, [implAddress, deployer]);

  const importedBeacon = await upgrades.forceImport(beaconAddress, 'Greeter');
  t.is(importedBeacon.address, beaconAddress);
  // Read through the returned read-capable beacon instance.
  t.is(await importedBeacon.read.implementation(), implAddress);
});
