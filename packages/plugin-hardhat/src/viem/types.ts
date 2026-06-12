import type { silenceWarnings } from '@openzeppelin/upgrades-core';
import type { Address } from 'viem';

import type { DeployProxyFunction } from './deploy-proxy.js';
import type { UpgradeProxyFunction } from './upgrade-proxy.js';
import type { ValidateImplementationFunction } from './validate-implementation.js';
import type { ValidateUpgradeFunction } from './validate-upgrade.js';
import type { DeployImplementationFunction } from './deploy-implementation.js';
import type { PrepareUpgradeFunction } from './prepare-upgrade.js';
import type { DeployBeaconFunction } from './deploy-beacon.js';
import type { DeployBeaconProxyFunction } from './deploy-beacon-proxy.js';
import type { UpgradeBeaconFunction } from './upgrade-beacon.js';
import type { ForceImportFunction } from './force-import.js';
import type { ChangeAdminFunction, TransferProxyAdminOwnershipFunction } from './admin.js';

export type {
  DeployProxyFunction,
  UpgradeProxyFunction,
  ValidateImplementationFunction,
  ValidateUpgradeFunction,
  DeployImplementationFunction,
  PrepareUpgradeFunction,
  DeployBeaconFunction,
  DeployBeaconProxyFunction,
  UpgradeBeaconFunction,
  ForceImportFunction,
  ChangeAdminFunction,
  TransferProxyAdminOwnershipFunction,
};

/**
 * The viem-based counterpart of the `HardhatUpgrades` interface. Contracts are identified
 * by their names following `@nomicfoundation/hardhat-viem` conventions, and the returned
 * contract instances are viem contract instances.
 */
export interface HardhatViemUpgrades {
  deployProxy: DeployProxyFunction;
  upgradeProxy: UpgradeProxyFunction;
  validateImplementation: ValidateImplementationFunction;
  validateUpgrade: ValidateUpgradeFunction;
  deployImplementation: DeployImplementationFunction;
  prepareUpgrade: PrepareUpgradeFunction;
  deployBeacon: DeployBeaconFunction;
  deployBeaconProxy: DeployBeaconProxyFunction;
  upgradeBeacon: UpgradeBeaconFunction;
  forceImport: ForceImportFunction;
  silenceWarnings: typeof silenceWarnings;
  admin: {
    changeProxyAdmin: ChangeAdminFunction;
    transferProxyAdminOwnership: TransferProxyAdminOwnershipFunction;
  };
  erc1967: {
    getAdminAddress: (proxyAddress: Address) => Promise<Address>;
    getImplementationAddress: (proxyAddress: Address) => Promise<Address>;
    getBeaconAddress: (proxyAddress: Address) => Promise<Address>;
  };
  beacon: {
    getImplementationAddress: (beaconAddress: Address) => Promise<Address>;
  };
}
