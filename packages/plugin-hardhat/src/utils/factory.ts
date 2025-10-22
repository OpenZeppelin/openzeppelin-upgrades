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
 *   const { deployProxy, upgradeProxy } = upgrades(hre);
 *   await deployProxy(MyContract, []);
 * });
 * ```
 * 
 * @param hre - Hardhat Runtime Environment
 * @returns API object with all upgrade functions
 */
export function upgrades(hre: HardhatRuntimeEnvironment): HardhatUpgrades {
  warnOnHardhatDefender();
  return createUpgradesAPI(hre, false);
}

/**
 * Factory function to create the Defender-enabled upgrades API.
 * 
 * @example
 * ```typescript
 * import { defender } from '@openzeppelin/hardhat-upgrades';
 * 
 * task('deploy', async (args, hre) => {
 *   const { deployContract } = defender(hre);
 *   await deployContract(...);
 * });
 * ```
 * 
 * @param hre - Hardhat Runtime Environment
 * @returns API object with all upgrade and Defender functions
 */
export function defender(hre: HardhatRuntimeEnvironment): DefenderHardhatUpgrades {
  warnOnHardhatDefender();
  return createDefenderAPI(hre);
}

function createUpgradesAPI(
  hre: HardhatRuntimeEnvironment,
  isDefender: boolean
): HardhatUpgrades {
  // Synchronous lazy load using require() for immediate availability
  const { makeDeployProxy } = require('../deploy-proxy.js');
  const { makeUpgradeProxy } = require('../upgrade-proxy.js');
  const { makeValidateImplementation } = require('../validate-implementation.js');
  const { makeValidateUpgrade } = require('../validate-upgrade.js');
  const { makeDeployImplementation } = require('../deploy-implementation.js');
  const { makePrepareUpgrade } = require('../prepare-upgrade.js');
  const { makeDeployBeacon } = require('../deploy-beacon.js');
  const { makeDeployBeaconProxy } = require('../deploy-beacon-proxy.js');
  const { makeUpgradeBeacon } = require('../upgrade-beacon.js');
  const { makeForceImport } = require('../force-import.js');
  const { makeChangeProxyAdmin, makeTransferProxyAdminOwnership } = require('../admin.js');

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

function createDefenderAPI(hre: HardhatRuntimeEnvironment): DefenderHardhatUpgrades {
  // Get base upgrades API with defender flag (synchronous)
  const upgradesAPI = createUpgradesAPI(hre, true);

  // Synchronous lazy load of Defender-specific functions
  const { makeDeployContract } = require('../deploy-contract.js');
  const { makeProposeUpgradeWithApproval } = require('../defender/propose-upgrade-with-approval.js');
  const { makeGetDeployApprovalProcess, makeGetUpgradeApprovalProcess } = require('../defender/get-approval-process.js');

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

function warnOnHardhatDefender(): void {
  try {
    require.resolve('@openzeppelin/hardhat-defender');
    const { logWarning } = require('@openzeppelin/upgrades-core');
    logWarning('The @openzeppelin/hardhat-defender package is deprecated.', [
      'Uninstall the @openzeppelin/hardhat-defender package.',
      'OpenZeppelin Defender integration is included as part of the Hardhat Upgrades plugin.',
    ]);
  } catch (e: any) {
    // Package not installed, no warning needed
  }
}
