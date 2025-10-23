import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
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
 *   const api = await upgrades(hre);
 *   await api.deployProxy(MyContract, []);
 * });
 * ```
 *
 * @param hre - Hardhat Runtime Environment
 * @returns API object with all upgrade functions
 */
export async function upgrades(hre: HardhatRuntimeEnvironment): Promise<HardhatUpgrades> {
  await warnOnHardhatDefender();
  return await createUpgradesAPI(hre, false);
}

/**
 * Factory function to create the Defender-enabled upgrades API.
 *
 * @example
 * ```typescript
 * import { defender } from '@openzeppelin/hardhat-upgrades';
 *
 * task('deploy', async (args, hre) => {
 *   const api = await defender(hre);
 *   await api.deployContract(...);
 * });
 * ```
 *
 * @param hre - Hardhat Runtime Environment
 * @returns API object with all upgrade and Defender functions
 */
export async function defender(hre: HardhatRuntimeEnvironment): Promise<DefenderHardhatUpgrades> {
  await warnOnHardhatDefender();
  return await createDefenderAPI(hre);
}

async function createUpgradesAPI(hre: HardhatRuntimeEnvironment, isDefender: boolean): Promise<HardhatUpgrades> {
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

  // Helper to get provider lazily when needed
  const getProvider = async () => {
    const { ethers } = await hre.network.connect();
    return ethers.provider;
  };

  return {
    silenceWarnings,
    deployProxy: makeDeployProxy(hre, isDefender),
    upgradeProxy: makeUpgradeProxy(hre, isDefender),
    validateImplementation: makeValidateImplementation(hre),
    validateUpgrade: makeValidateUpgrade(hre),
    deployImplementation: makeDeployImplementation(hre, isDefender),
    prepareUpgrade: makePrepareUpgrade(hre, isDefender),
    deployBeacon: makeDeployBeacon(hre, isDefender),
    deployBeaconProxy: makeDeployBeaconProxy(hre, isDefender),
    upgradeBeacon: makeUpgradeBeacon(hre, isDefender),
    forceImport: makeForceImport(hre),
    admin: {
      changeProxyAdmin: makeChangeProxyAdmin(hre, isDefender),
      transferProxyAdminOwnership: makeTransferProxyAdminOwnership(hre, isDefender),
    },
    erc1967: {
      getAdminAddress: async (proxyAddress: string) => {
        const provider = await getProvider();
        return getAdminAddress(provider, proxyAddress);
      },
      getImplementationAddress: async (proxyAddress: string) => {
        const provider = await getProvider();
        return getImplementationAddress(provider, proxyAddress);
      },
      getBeaconAddress: async (proxyAddress: string) => {
        const provider = await getProvider();
        return getBeaconAddress(provider, proxyAddress);
      },
    },
    beacon: {
      getImplementationAddress: async (beaconAddress: string) => {
        const provider = await getProvider();
        return getImplementationAddressFromBeacon(provider, beaconAddress);
      },
    },
  };
}

async function createDefenderAPI(hre: HardhatRuntimeEnvironment): Promise<DefenderHardhatUpgrades> {
  // Get base upgrades API with defender flag
  const upgradesAPI = await createUpgradesAPI(hre, true);

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

  const getUpgradeApprovalProcess = makeGetUpgradeApprovalProcess(hre);

  return {
    ...upgradesAPI,
    deployContract: makeDeployContract(hre, true),
    proposeUpgradeWithApproval: makeProposeUpgradeWithApproval(hre, true),
    getDeployApprovalProcess: makeGetDeployApprovalProcess(hre),
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
