import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { HardhatUpgrades, DefenderHardhatUpgrades } from '../types.js';
import {
  silenceWarnings,
  getAdminAddress,
  getImplementationAddress,
  getBeaconAddress,
  getImplementationAddressFromBeacon,
} from '@openzeppelin/upgrades-core';

/**
 * Factory function to create the upgrades API for a given HRE.
 *
 * @example
 * ```typescript
 * import { upgrades } from '@openzeppelin/hardhat-upgrades';
 *
 * task('deploy', async (args, hre) => {
 *   const connection = await hre.network.connect();
 *   const api = await upgrades(hre, connection);
 *   await api.deployProxy(MyContract, []);
 * });
 * ```
 *
 * @param hre - Hardhat Runtime Environment
 * @param connection - Optional network connection object from await hre.network.connect()
 * @returns API object with all upgrade functions
 */
export async function upgrades(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): Promise<HardhatUpgrades> {
  await warnOnHardhatDefender();
  if (!connection) {
    connection = await hre.network.connect();
  }
  return await createUpgradesAPI(hre, false, connection);
}

/**
 * Factory function to create the Defender-enabled upgrades API.
 *
 * @example
 * ```typescript
 * import { defender } from '@openzeppelin/hardhat-upgrades';
 *
 * task('deploy', async (args, hre) => {
 *   const connection = await hre.network.connect();
 *   const api = await defender(hre, connection);
 *   await api.deployContract(...);
 * });
 * ```
 *
 * @param hre - Hardhat Runtime Environment
 * @param connection - Optional network connection object from await hre.network.connect()
 * @returns API object with all upgrade and Defender functions
 */
export async function defender(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): Promise<DefenderHardhatUpgrades> {
  await warnOnHardhatDefender();
  return await createDefenderAPI(hre, connection);
}

async function createUpgradesAPI(hre: HardhatRuntimeEnvironment, isDefender: boolean, connection: NetworkConnection): Promise<HardhatUpgrades> {
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
    import('../deploy-proxy.js'),
    import('../upgrade-proxy.js'),
    import('../validate-implementation.js'),
    import('../validate-upgrade.js'),
    import('../deploy-implementation.js'),
    import('../prepare-upgrade.js'),
    import('../deploy-beacon.js'),
    import('../deploy-beacon-proxy.js'),
    import('../upgrade-beacon.js'),
    import('../force-import.js'),
    import('../admin.js'),
  ]);

  // Extract ethers from connection for use in erc1967 and beacon helpers
  const { ethers } = connection;

  return {
    silenceWarnings,
    deployProxy: makeDeployProxy(hre, isDefender, connection),
    upgradeProxy: makeUpgradeProxy(hre, isDefender, connection),
    validateImplementation: makeValidateImplementation(hre, connection),
    validateUpgrade: makeValidateUpgrade(hre, connection),
    deployImplementation: makeDeployImplementation(hre, isDefender, connection),
    prepareUpgrade: makePrepareUpgrade(hre, isDefender, connection),
    deployBeacon: makeDeployBeacon(hre, isDefender, connection),
    deployBeaconProxy: makeDeployBeaconProxy(hre, isDefender, connection),
    upgradeBeacon: makeUpgradeBeacon(hre, isDefender, connection),
    forceImport: makeForceImport(hre, connection),
    admin: {
      changeProxyAdmin: makeChangeProxyAdmin(hre, isDefender, connection),
      transferProxyAdminOwnership: makeTransferProxyAdminOwnership(hre, isDefender, connection),
    },
    erc1967: {
      getAdminAddress: async (proxyAddress: string) => {
        return getAdminAddress(ethers.provider, proxyAddress);
      },
      getImplementationAddress: async (proxyAddress: string) => {
        return getImplementationAddress(ethers.provider, proxyAddress);
      },
      getBeaconAddress: async (proxyAddress: string) => {
        return getBeaconAddress(ethers.provider, proxyAddress);
      },
    },
    beacon: {
      getImplementationAddress: async (beaconAddress: string) => {
        return getImplementationAddressFromBeacon(ethers.provider, beaconAddress);
      },
    },
  };
}

async function createDefenderAPI(hre: HardhatRuntimeEnvironment, connection: NetworkConnection): Promise<DefenderHardhatUpgrades> {
  // Get base upgrades API with defender flag
  const upgradesAPI = await createUpgradesAPI(hre, true, connection);

  // Dynamic imports for Defender-specific functions
  const [
    { makeDeployContract },
    { makeProposeUpgradeWithApproval },
    { makeGetDeployApprovalProcess, makeGetUpgradeApprovalProcess },
  ] = await Promise.all([
    import('../deploy-contract.js'),
    import('../defender/propose-upgrade-with-approval.js'),
    import('../defender/get-approval-process.js'),
  ]);

  const getUpgradeApprovalProcess = makeGetUpgradeApprovalProcess(hre, connection);

  return {
    ...upgradesAPI,
    deployContract: makeDeployContract(hre, true, connection),
    proposeUpgradeWithApproval: makeProposeUpgradeWithApproval(hre, true, connection),
    getDeployApprovalProcess: makeGetDeployApprovalProcess(hre, connection),
    getUpgradeApprovalProcess: getUpgradeApprovalProcess,
    getDefaultApprovalProcess: getUpgradeApprovalProcess, // deprecated alias
  };
}

async function warnOnHardhatDefender(): Promise<void> {
  try {
    // Try to import the deprecated package to check if it's installed
    // @ts-expect-error - Package may not be installed, which is the expected case
    await import('@openzeppelin/hardhat-defender');
    const { logWarning } = await import('@openzeppelin/upgrades-core');
    logWarning('The @openzeppelin/hardhat-defender package is deprecated.', [
      'Uninstall the @openzeppelin/hardhat-defender package.',
      'OpenZeppelin Defender integration is included as part of the Hardhat Upgrades plugin.',
    ]);
  } catch (e: any) {
    // Package not installed, no warning needed
  }
}
