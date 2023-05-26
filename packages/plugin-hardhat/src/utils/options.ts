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
  walletId?: string;
  salt?: string;
};

export type DeployBeaconProxyOptions = DeployOpts & ProxyKindOption & Initializer & PlatformDeployOptions;
export type DeployBeaconOptions = StandaloneOptions & Platform;
export type DeployImplementationOptions = StandaloneOptions & GetTxResponse & PlatformDeployOptions;
export type DeployContractOptions = StandaloneOptions &
  GetTxResponse &
  PlatformDeployOptions & {
    unsafeAllowDeployContract?: boolean;
  };
export type DeployProxyAdminOptions = DeployOpts & Platform;
export type DeployProxyOptions = StandaloneOptions & Initializer & PlatformDeployOptions;
export type ForceImportOptions = ProxyKindOption;
export type PrepareUpgradeOptions = UpgradeOptions & GetTxResponse & PlatformDeployOptions;
export type UpgradeBeaconOptions = UpgradeOptions & Platform;
export type UpgradeProxyOptions = UpgradeOptions & {
  call?: { fn: string; args?: unknown[] } | string;
} & Platform;
export type ValidateImplementationOptions = StandaloneValidationOptions;
export type ValidateUpgradeOptions = ValidationOptions;
