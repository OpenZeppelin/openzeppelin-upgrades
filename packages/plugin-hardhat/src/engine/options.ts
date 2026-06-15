import {
  DeployOpts,
  ProxyKindOption,
  StandaloneValidationOptions,
  ValidationOptions,
  withValidationDefaults,
} from '@openzeppelin/upgrades-core';

/**
 * Client-neutral options shared by both the ethers and viem bindings. The engine reads only
 * these fields; each binding extends them with its own client-specific options (e.g. the
 * ethers binding's `txOverrides`, the viem binding's `gas`/`value`/`client`).
 *
 * This module references neither `ethers` nor `viem`, so it is safe to import from either
 * binding's type chain.
 */

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

/**
 * Option for functions that support getting a transaction response.
 */
export type GetTxResponse = {
  getTxResponse?: boolean;
};

export type Initializer = {
  initializer?: string | false;
};

export type InitialOwner = {
  initialOwner?: string;

  /**
   * Skips checking the `initialOwner` option when deploying a transparent proxy.
   */
  unsafeSkipProxyAdminCheck?: boolean;
};

/**
 * The optional initializer/upgrade call for `upgradeProxy`.
 */
export type Call = { fn: string; args?: unknown[] } | string;

export type { ProxyKindOption, StandaloneValidationOptions, ValidationOptions, DeployOpts };

// Neutral per-operation option types that the engine reads. Each binding's public option type
// is a superset of the corresponding type here.
export type DeployProxyOptions = StandaloneOptions & Initializer & InitialOwner;
export type DeployBeaconOptions = StandaloneOptions & InitialOwner;
export type DeployBeaconProxyOptions = DeployOpts & ProxyKindOption & Initializer;
export type DeployImplementationOptions = StandaloneOptions & GetTxResponse;
export type ForceImportOptions = ProxyKindOption;
export type PrepareUpgradeOptions = UpgradeOptions & GetTxResponse;
export type UpgradeBeaconOptions = UpgradeOptions;
export type UpgradeProxyOptions = UpgradeOptions & { call?: Call };
export type ValidateImplementationOptions = StandaloneValidationOptions;
export type ValidateUpgradeOptions = ValidationOptions;
export type AdminOptions = { silent?: boolean };

/**
 * Fills in the engine-relevant defaults for the upgrade options. The client-specific transaction
 * options (ethers `txOverrides`, viem `gas`/`value`/...) are handled by the bindings, not here.
 */
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
