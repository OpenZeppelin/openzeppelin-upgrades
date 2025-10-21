import type { silenceWarnings } from '@openzeppelin/upgrades-core';
import type { DeployFunction } from './deploy-proxy.js';
import type { PrepareUpgradeFunction } from './prepare-upgrade.js';
import type { UpgradeFunction } from './upgrade-proxy.js';
import type { DeployBeaconFunction } from './deploy-beacon.js';
import type { DeployBeaconProxyFunction } from './deploy-beacon-proxy.js';
import type { UpgradeBeaconFunction } from './upgrade-beacon.js';
import type { ForceImportFunction } from './force-import.js';
import type { ChangeAdminFunction, TransferProxyAdminOwnershipFunction } from './admin.js';
import type { ValidateImplementationFunction } from './validate-implementation.js';
import type { ValidateUpgradeFunction } from './validate-upgrade.js';
import type { DeployImplementationFunction } from './deploy-implementation.js';
import type { DeployContractFunction } from './deploy-contract.js';
import type { ProposeUpgradeWithApprovalFunction } from './defender/propose-upgrade-with-approval.js';
import type {
  GetDeployApprovalProcessFunction,
  GetUpgradeApprovalProcessFunction,
} from './defender/get-approval-process.js';

export interface HardhatUpgrades {
  deployProxy: DeployFunction;
  upgradeProxy: UpgradeFunction;
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
    getAdminAddress: (proxyAddress: string) => Promise<string>;
    getImplementationAddress: (proxyAddress: string) => Promise<string>;
    getBeaconAddress: (proxyAddress: string) => Promise<string>;
  };
  beacon: {
    getImplementationAddress: (beaconAddress: string) => Promise<string>;
  };
}

export interface DefenderHardhatUpgrades extends HardhatUpgrades {
  deployContract: DeployContractFunction;
  proposeUpgradeWithApproval: ProposeUpgradeWithApprovalFunction;
  getDeployApprovalProcess: GetDeployApprovalProcessFunction;
  getUpgradeApprovalProcess: GetUpgradeApprovalProcessFunction;
  getDefaultApprovalProcess: GetUpgradeApprovalProcessFunction;
}
