import {
  DeployOpts,
  ProxyKindOption,
  StandaloneValidationOptions,
  ValidationOptions,
  withValidationDefaults,
} from '@openzeppelin/upgrades-core';
import { Overrides } from 'ethers';

/**
 * Options for functions that can deploy an implementation contract.
 */
export type StandaloneOptions = StandaloneValidationOptions &
  DeployOpts & {
    constructorArgs?: unknown[];
    /**
     * @deprecated Use `redeployImplementation = 'never'` instead.
     */
    useDeployedImplementation?: boolean;
    redeployImplementation?: 'always' | 'never' | 'onchange';
  };

/**
 * Options for functions that can deploy a new version of an implementation contract for upgrading.
 */
export type UpgradeOptions = ValidationOptions & StandaloneOptions;

export function withDefaults(opts: UpgradeOptions = {}): Required<UpgradeOptions> {
  return {
    constructorArgs: opts.constructorArgs ?? [],
    timeout: opts.timeout ?? 60e3,
    pollingInterval: opts.pollingInterval ?? 5e3,
    useDeployedImplementation: opts.useDeployedImplementation ?? false,
    redeployImplementation: opts.redeployImplementation ?? 'onchange',
    ...withValidationDefaults(opts),
  };
}

/**
 * Option for functions that support getting a transaction response.
 */
export type GetTxResponse = {
  getTxResponse?: boolean;
};

type Initializer = {
  initializer?: string | false;
};

/**
 * Option to enable or disable Platform deployments.
 */
export type Platform = {
  usePlatformDeploy?: boolean;
};

/**
 * Options for functions that support Platform deployments.
 */
export type PlatformDeployOptions = Platform & {
  verifySourceCode?: boolean;
  relayerId?: string;
  salt?: string;
};

/**
 * Options for functions that support deployments through ethers.js.
 */
export type EthersDeployOptions = {
  /**
   * Overrides for the transaction sent to deploy a contract.
   */
  txOverrides?: Overrides;
};

export type DeployBeaconProxyOptions = EthersDeployOptions &
  DeployOpts &
  ProxyKindOption &
  Initializer &
  PlatformDeployOptions;
export type DeployBeaconOptions = EthersDeployOptions & StandaloneOptions & Platform;
export type DeployImplementationOptions = EthersDeployOptions &
  StandaloneOptions &
  GetTxResponse &
  PlatformDeployOptions;
export type DeployContractOptions = EthersDeployOptions &
  StandaloneOptions &
  GetTxResponse &
  PlatformDeployOptions & {
    unsafeAllowDeployContract?: boolean;
  };
export type DeployProxyAdminOptions = EthersDeployOptions & DeployOpts & Platform;
export type DeployProxyOptions = EthersDeployOptions & StandaloneOptions & Initializer & PlatformDeployOptions;
export type ForceImportOptions = ProxyKindOption;
export type PrepareUpgradeOptions = EthersDeployOptions & UpgradeOptions & GetTxResponse & PlatformDeployOptions;
export type UpgradeBeaconOptions = EthersDeployOptions & UpgradeOptions & Platform;
export type UpgradeProxyOptions = EthersDeployOptions &
  UpgradeOptions & {
    call?: { fn: string; args?: unknown[] } | string;
  } & Platform;
export type ValidateImplementationOptions = StandaloneValidationOptions;
export type ValidateUpgradeOptions = ValidationOptions;
