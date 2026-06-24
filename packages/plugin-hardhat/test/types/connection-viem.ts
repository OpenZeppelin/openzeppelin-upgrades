import hre from 'hardhat';
import { upgrades, proxyFilesToBuild } from '@openzeppelin/hardhat-upgrades/viem';
import type { HardhatViemUpgrades, UpgradeableBeaconContract } from '@openzeppelin/hardhat-upgrades/viem';
import type { ParseAbi } from 'viem';

/**
 * Consumer-style type checks for the viem-based API.
 *
 * This file is type-checked (not executed) against the built `dist` types via the tsconfig in
 * this directory, in isolation from the rest of the repo. It asserts that importing only
 * `@openzeppelin/hardhat-upgrades/viem` is enough for TypeScript to recognize `connection.viem`,
 * and that the API takes contract names and returns viem contract instances, following
 * `@nomicfoundation/hardhat-viem` conventions, with no ethers types in the API surface.
 */

// Simulates the artifact type declarations that `hardhat compile` generates, which cannot be
// used here because this check runs in isolation without compiling contracts. Only the `abi`
// member participates in typing the contract instances by name.
type BoxAbi = ParseAbi<
  [
    'function initialize(uint256 initialValue)',
    'function retrieve() view returns (uint256)',
    'function store(uint256 value)',
  ]
>;

declare module 'hardhat/types/artifacts' {
  interface ArtifactMap {
    ['Box']: { abi: BoxAbi };
  }
}

export async function typeCheck(): Promise<void> {
  const connection = await hre.network.create();

  // `connection.viem` is recognized from importing only '@openzeppelin/hardhat-upgrades/viem'
  const publicClient = await connection.viem.getPublicClient();
  const [walletClient] = await connection.viem.getWalletClients();

  const upgradesApi: HardhatViemUpgrades = await upgrades(hre, connection);

  // Typed contract instances by contract name
  const box = await upgradesApi.deployProxy('Box', [42n], {
    kind: 'transparent',
    initialOwner: walletClient.account.address,
    client: { wallet: walletClient },
    gas: 5_000_000n,
  });
  const address: `0x${string}` = box.address;
  const value: bigint = await box.read.retrieve();
  await box.write.store([value]);

  const upgraded = await upgradesApi.upgradeProxy(box, 'Box', { call: { fn: 'store', args: [1n] } });
  await upgraded.read.retrieve();

  // Contracts without generated artifact types fall back to generic viem instances
  const generic = await upgradesApi.deployProxy('SomeContract', { initializer: false });
  const genericAddress: `0x${string}` = generic.address;

  // Beacons are typed viem contract instances of UpgradeableBeacon
  const beacon: UpgradeableBeaconContract = await upgradesApi.deployBeacon('Box', {
    initialOwner: walletClient.account.address,
  });
  const beaconImpl: `0x${string}` = await beacon.read.implementation();
  await beacon.write.upgradeTo([beaconImpl]);

  const boxProxy = await upgradesApi.deployBeaconProxy(beacon, 'Box', [42n]);
  await boxProxy.read.retrieve();
  await upgradesApi.upgradeBeacon(beacon.address, 'Box');

  // Addresses are viem addresses
  const implAddress: `0x${string}` = await upgradesApi.deployImplementation('Box');
  const preparedAddress: `0x${string}` = await upgradesApi.prepareUpgrade(box.address, 'Box');
  const adminAddress: `0x${string}` = await upgradesApi.erc1967.getAdminAddress(box.address);
  const beaconImplAddress: `0x${string}` = await upgradesApi.beacon.getImplementationAddress(beacon.address);

  // Validations take contract names
  await upgradesApi.validateImplementation('Box', { unsafeAllow: ['constructor'] });
  await upgradesApi.validateUpgrade('Box', 'Box', { kind: 'transparent' });
  await upgradesApi.validateUpgrade(box.address, 'Box');

  // Admin functions take viem wallet clients and transaction options
  await upgradesApi.admin.changeProxyAdmin(box.address, adminAddress, walletClient, { gas: 500_000n });
  await upgradesApi.admin.transferProxyAdminOwnership(box.address, adminAddress, walletClient, {
    silent: true,
    maxFeePerGas: 1_000_000_000n,
  });

  // Transactions can send value, e.g. for payable initializers
  await upgradesApi.deployProxy('Box', [42n], { value: 1n });

  // Force import takes an address or instance and returns a typed instance
  const imported = await upgradesApi.forceImport(box.address, 'Box', { kind: 'transparent' });
  await imported.read.retrieve();
  await upgradesApi.forceImport(box, 'Box', { client: { wallet: walletClient } });

  // Solidity-test helper is available from the viem entry point too, so a viem-only project
  // (without @nomicfoundation/hardhat-ethers) can configure `npmFilesToBuild` without importing
  // the ethers-typed root entry.
  const proxyFiles: string[] = proxyFilesToBuild();
  void proxyFiles;

  // The clients are usable as regular viem clients
  await publicClient.getCode({ address });
  void genericAddress;
  void implAddress;
  void preparedAddress;
  void beaconImplAddress;
}
