import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { Address } from 'viem';
import type { HardhatViemUpgrades } from './types.js';

import {
  silenceWarnings,
  getAdminAddress,
  getImplementationAddress,
  getBeaconAddress,
  getImplementationAddressFromBeacon,
} from '@openzeppelin/upgrades-core';

import { asAddress, assertHardhatViem } from './utils.js';

/**
 * Factory function to create the viem-based upgrades API for a given HRE.
 *
 * Requires the @nomicfoundation/hardhat-viem plugin to be registered in the Hardhat config,
 * in addition to this plugin.
 *
 * @example
 * ```typescript
 * import { upgrades } from '@openzeppelin/hardhat-upgrades/viem';
 *
 * const connection = await hre.network.create();
 * const api = await upgrades(hre, connection);
 * const proxy = await api.deployProxy('MyContract', [42]);
 * console.log(await proxy.read.myValue());
 * ```
 *
 * @param hre - Hardhat Runtime Environment
 * @param connection - Network connection from `await hre.network.create()`. Share one connection across operations; do not create a new one per call.
 * @returns API object with all upgrade functions
 */
export async function upgrades(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): Promise<HardhatViemUpgrades> {
  assertHardhatViem(connection);

  // Dynamic imports for ES modules
  const [
    { makeDeployProxy },
    { makeUpgradeProxy },
    { makeValidateImplementation },
    { makeValidateUpgrade },
    { makeDeployImplementation },
    { makePrepareUpgrade },
    { makeDeployBeacon },
    { makeDeployBeaconProxy },
    { makeUpgradeBeacon },
    { makeForceImport },
    { makeChangeProxyAdmin, makeTransferProxyAdminOwnership },
  ] = await Promise.all([
    import('./deploy-proxy.js'),
    import('./upgrade-proxy.js'),
    import('./validate-implementation.js'),
    import('./validate-upgrade.js'),
    import('./deploy-implementation.js'),
    import('./prepare-upgrade.js'),
    import('./deploy-beacon.js'),
    import('./deploy-beacon-proxy.js'),
    import('./upgrade-beacon.js'),
    import('./force-import.js'),
    import('./admin.js'),
  ]);

  // The ERC-1967 and beacon helpers of @openzeppelin/upgrades-core are client-agnostic
  const { ethers } = connection;

  return {
    silenceWarnings,
    deployProxy: makeDeployProxy(hre, connection),
    upgradeProxy: makeUpgradeProxy(hre, connection),
    validateImplementation: makeValidateImplementation(hre, connection),
    validateUpgrade: makeValidateUpgrade(hre, connection),
    deployImplementation: makeDeployImplementation(hre, connection),
    prepareUpgrade: makePrepareUpgrade(hre, connection),
    deployBeacon: makeDeployBeacon(hre, connection),
    deployBeaconProxy: makeDeployBeaconProxy(hre, connection),
    upgradeBeacon: makeUpgradeBeacon(hre, connection),
    forceImport: makeForceImport(hre, connection),
    admin: {
      changeProxyAdmin: makeChangeProxyAdmin(hre, connection),
      transferProxyAdminOwnership: makeTransferProxyAdminOwnership(hre, connection),
    },
    erc1967: {
      getAdminAddress: async (proxyAddress: Address) => {
        return asAddress(await getAdminAddress(ethers.provider, proxyAddress));
      },
      getImplementationAddress: async (proxyAddress: Address) => {
        return asAddress(await getImplementationAddress(ethers.provider, proxyAddress));
      },
      getBeaconAddress: async (proxyAddress: Address) => {
        return asAddress(await getBeaconAddress(ethers.provider, proxyAddress));
      },
    },
    beacon: {
      getImplementationAddress: async (beaconAddress: Address) => {
        return asAddress(await getImplementationAddressFromBeacon(ethers.provider, beaconAddress));
      },
    },
  };
}

// Types
export type { HardhatViemUpgrades } from './types.js';
export type { ContractAddressOrInstance } from './utils.js';
export type * from './options.js';

// Function types
export type { DeployProxyFunction } from './deploy-proxy.js';
export type { UpgradeProxyFunction } from './upgrade-proxy.js';
export type { ValidateImplementationFunction } from './validate-implementation.js';
export type { ValidateUpgradeFunction } from './validate-upgrade.js';
export type { DeployImplementationFunction } from './deploy-implementation.js';
export type { PrepareUpgradeFunction } from './prepare-upgrade.js';
export type { DeployBeaconFunction } from './deploy-beacon.js';
export type { DeployBeaconProxyFunction } from './deploy-beacon-proxy.js';
export type { UpgradeBeaconFunction } from './upgrade-beacon.js';
export type { ForceImportFunction } from './force-import.js';
export type { ChangeAdminFunction, TransferProxyAdminOwnershipFunction } from './admin.js';

// UpgradeableBeacon contract helpers
export { upgradeableBeaconAbi } from './upgradeable-beacon.js';
export type { UpgradeableBeaconContract } from './upgradeable-beacon.js';

// Re-export the types of @nomicfoundation/hardhat-viem so that `connection.viem` is recognized
// by TypeScript from importing this module, mirroring the re-export of the hardhat-ethers types
// from the package's main entry point.
export type * from '@nomicfoundation/hardhat-viem';
