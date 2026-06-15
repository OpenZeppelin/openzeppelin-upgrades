import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { HardhatUpgrades, DefenderHardhatUpgrades } from '../types.js';
import {
  silenceWarnings,
  getAdminAddress,
  getImplementationAddress,
  getBeaconAddress,
  getImplementationAddressFromBeacon,
  logWarning,
  UpgradesError,
} from '@openzeppelin/upgrades-core';
import { tryRequire } from './try-require.js';

/**
 * Asserts that @nomicfoundation/hardhat-ethers is in use, since the ethers-flavored API takes
 * ethers `ContractFactory` inputs and returns ethers contracts. Both packages are optional peer
 * dependencies, so this turns a missing one into an actionable error instead of a cryptic
 * `TypeError` reading `provider` of `undefined`.
 */
function assertHardhatEthers(connection: NetworkConnection): void {
  if (!('ethers' in connection) || (connection as { ethers?: unknown }).ethers === undefined) {
    throw new UpgradesError(
      'The @openzeppelin/hardhat-upgrades ethers-based API requires @nomicfoundation/hardhat-ethers and ethers.',
      () =>
        'Install them with `npm install --save-dev @nomicfoundation/hardhat-ethers ethers` (they are loaded automatically once installed), ' +
        'or use the viem-based API from `@openzeppelin/hardhat-upgrades/viem`.',
    );
  }
}

/**
 * Factory function to create the upgrades API for a given HRE.
 *
 * @example
 * ```typescript
 * import { upgrades } from '@openzeppelin/hardhat-upgrades';
 *
 * task('deploy', async (args, hre) => {
 *   const connection = await hre.network.create();
 *   const api = await upgrades(hre, connection);
 *   await api.deployProxy(MyContract, []);
 * });
 * ```
 *
 * @param hre - Hardhat Runtime Environment
 * @param connection - Network connection from `await hre.network.create()`. Share one connection across operations; do not create a new one per call.
 * @returns API object with all upgrade functions
 */
export async function upgrades(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): Promise<HardhatUpgrades> {
  assertHardhatEthers(connection);
  warnOnHardhatDefender();
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
 *   const connection = await hre.network.create();
 *   const api = await defender(hre, connection);
 *   await api.deployContract(...);
 * });
 * ```
 *
 * @param hre - Hardhat Runtime Environment
 * @param connection - Network connection from `await hre.network.create()`. Share one connection across operations; do not create a new one per call.
 * @returns API object with all upgrade and Defender functions
 */
export async function defender(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): Promise<DefenderHardhatUpgrades> {
  assertHardhatEthers(connection);
  warnOnHardhatDefender();
  return await createDefenderAPI(hre, connection);
}

async function createUpgradesAPI(
  hre: HardhatRuntimeEnvironment,
  isDefender: boolean,
  connection: NetworkConnection,
): Promise<HardhatUpgrades> {
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

  // The erc1967 and beacon helpers of @openzeppelin/upgrades-core read through the connection's
  // EIP-1193 provider directly.
  const provider = connection.provider;

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
        return getAdminAddress(provider, proxyAddress);
      },
      getImplementationAddress: async (proxyAddress: string) => {
        return getImplementationAddress(provider, proxyAddress);
      },
      getBeaconAddress: async (proxyAddress: string) => {
        return getBeaconAddress(provider, proxyAddress);
      },
    },
    beacon: {
      getImplementationAddress: async (beaconAddress: string) => {
        return getImplementationAddressFromBeacon(provider, beaconAddress);
      },
    },
  };
}

async function createDefenderAPI(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
): Promise<DefenderHardhatUpgrades> {
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

function warnOnHardhatDefender(): void {
  if (tryRequire('@openzeppelin/hardhat-defender', true)) {
    logWarning('The @openzeppelin/hardhat-defender package is deprecated.', [
      'Uninstall the @openzeppelin/hardhat-defender package.',
      'OpenZeppelin Defender integration is included as part of the Hardhat Upgrades plugin.',
    ]);
  }
}
