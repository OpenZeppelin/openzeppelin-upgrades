import hre from 'hardhat';
import { upgrades } from '@openzeppelin/hardhat-upgrades/viem';
import type { HardhatViemUpgrades, UpgradeableBeaconContract } from '@openzeppelin/hardhat-upgrades/viem';

/**
 * Consumer-style type checks for the viem-based API.
 *
 * This file is type-checked (not executed) against the built `dist` types via the tsconfig in
 * this directory, in isolation from the rest of the repo. It asserts that importing only
 * `@openzeppelin/hardhat-upgrades/viem` is enough for TypeScript to recognize `connection.viem`,
 * and that the API takes contract names and returns viem contract instances, following
 * `@nomicfoundation/hardhat-viem` conventions, with no ethers types in the API surface.
 */

// Simulates the artifact type declarations that Hardhat generates on compile,
// so that the typed-by-contract-name path can be checked.
interface Box$Type {
  readonly _format: 'hh3-artifact-1';
  readonly contractName: 'Box';
  readonly sourceName: 'contracts/Box.sol';
  readonly abi: [
    {
      readonly inputs: [{ readonly internalType: 'uint256'; readonly name: 'initialValue'; readonly type: 'uint256' }];
      readonly name: 'initialize';
      readonly outputs: [];
      readonly stateMutability: 'nonpayable';
      readonly type: 'function';
    },
    {
      readonly inputs: [];
      readonly name: 'retrieve';
      readonly outputs: [{ readonly internalType: 'uint256'; readonly name: ''; readonly type: 'uint256' }];
      readonly stateMutability: 'view';
      readonly type: 'function';
    },
    {
      readonly inputs: [{ readonly internalType: 'uint256'; readonly name: 'value'; readonly type: 'uint256' }];
      readonly name: 'store';
      readonly outputs: [];
      readonly stateMutability: 'nonpayable';
      readonly type: 'function';
    },
  ];
  readonly bytecode: '0x';
  readonly deployedBytecode: '0x';
  readonly linkReferences: object;
  readonly deployedLinkReferences: object;
}

declare module 'hardhat/types/artifacts' {
  interface ArtifactMap {
    ['Box']: Box$Type;
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

  // Admin functions take viem wallet clients
  await upgradesApi.admin.changeProxyAdmin(box.address, adminAddress, walletClient);
  await upgradesApi.admin.transferProxyAdminOwnership(box.address, adminAddress, walletClient, { silent: true });

  // Force import
  await upgradesApi.forceImport(box.address, 'Box', { kind: 'transparent' });

  // The clients are usable as regular viem clients
  await publicClient.getCode({ address });
  void genericAddress;
  void implAddress;
  void preparedAddress;
  void beaconImplAddress;
}
