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

import { makeDeployProxy } from './deploy-proxy.js';
import { makeUpgradeProxy } from './upgrade-proxy.js';
import { makeValidateImplementation } from './validate-implementation.js';
import { makeValidateUpgrade } from './validate-upgrade.js';
import { makeDeployImplementation } from './deploy-implementation.js';
import { makePrepareUpgrade } from './prepare-upgrade.js';
import { makeDeployBeacon } from './deploy-beacon.js';
import { makeDeployBeaconProxy } from './deploy-beacon-proxy.js';
import { makeUpgradeBeacon } from './upgrade-beacon.js';
import { makeForceImport } from './force-import.js';
import { makeChangeProxyAdmin, makeTransferProxyAdminOwnership } from './admin.js';
import { asAddress, assertRequiredPlugins } from './utils.js';

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
  assertRequiredPlugins(connection);

  // The ERC-1967 and beacon helpers of @openzeppelin/upgrades-core are client-agnostic and read
  // through the connection's EIP-1193 provider directly, with no ethers dependency.
  const provider = connection.provider;

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
        return asAddress(await getAdminAddress(provider, proxyAddress));
      },
      getImplementationAddress: async (proxyAddress: Address) => {
        return asAddress(await getImplementationAddress(provider, proxyAddress));
      },
      getBeaconAddress: async (proxyAddress: Address) => {
        return asAddress(await getBeaconAddress(provider, proxyAddress));
      },
    },
    beacon: {
      getImplementationAddress: async (beaconAddress: Address) => {
        return asAddress(await getImplementationAddressFromBeacon(provider, beaconAddress));
      },
    },
  };
}

// Re-export the plugin object so a viem-only project can register it by importing from this entry
// point, instead of the root entry whose types reference @nomicfoundation/hardhat-ethers.
export { default } from '../plugin.js';

// Re-export the Solidity-test build helper from here too, so a viem-only project can configure
// `npmFilesToBuild` without importing the root entry (whose types reference @nomicfoundation/hardhat-ethers).
export { proxyFilesToBuild } from '../utils/npmFilesToBuild.js';

// Types
export type * from './types.js';
export type { ContractAddressOrInstance } from './utils.js';
export type * from './options.js';

// UpgradeableBeacon contract helpers
export { upgradeableBeaconAbi } from './upgradeable-beacon.js';
export type { UpgradeableBeaconContract } from './upgradeable-beacon.js';

// Re-export the types of @nomicfoundation/hardhat-viem so that `connection.viem` is recognized
// by TypeScript from importing this module, mirroring the re-export of the hardhat-ethers types
// from the package's main entry point.
export type * from '@nomicfoundation/hardhat-viem';
