import {
  DeployOpts,
  ProxyKindOption,
  StandaloneValidationOptions,
  ValidationOptions,
  withValidationDefaults,
} from '@openzeppelin/upgrades-core';

/**
 * Options for functions that can deploy an implementation contract.
 */
export type StandaloneOptions = StandaloneValidationOptions &
  DeployOpts & {
    constructorArgs?: unknown[];
    useDeployedImplementation?: boolean;
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
    useDeployedImplementation: opts.useDeployedImplementation ?? true,
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
  platform?: boolean;
};

/**
 * Options for functions that support Platform deployments.
 */
export type PlatformSupportedOptions = Platform & {
  verifySourceCode?: boolean;
};

export type DeployBeaconProxyOptions = DeployOpts & ProxyKindOption & Initializer & PlatformSupportedOptions;
export type DeployBeaconOptions = StandaloneOptions & Platform;
export type DeployImplementationOptions = StandaloneOptions & GetTxResponse & PlatformSupportedOptions;
export type DeployContractOptions = StandaloneOptions &
  GetTxResponse &
  PlatformSupportedOptions & {
    unsafeAllowDeployContract?: boolean;
  };
export type DeployProxyAdminOptions = DeployOpts & Platform;
export type DeployProxyOptions = StandaloneOptions & Initializer & PlatformSupportedOptions;
export type ForceImportOptions = ProxyKindOption;
export type PrepareUpgradeOptions = UpgradeOptions & GetTxResponse & PlatformSupportedOptions;
export type UpgradeBeaconOptions = UpgradeOptions & Platform;
export type UpgradeProxyOptions = UpgradeOptions & {
  call?: { fn: string; args?: unknown[] } | string;
} & Platform;
export type ValidateImplementationOptions = StandaloneValidationOptions;
export type ValidateUpgradeOptions = ValidationOptions;
