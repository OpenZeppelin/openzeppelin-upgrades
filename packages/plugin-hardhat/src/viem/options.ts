import type {
  DeployOpts,
  ProxyKindOption,
  StandaloneValidationOptions,
  ValidationOptions,
} from '@openzeppelin/upgrades-core';
import type { KeyedClient } from '@nomicfoundation/hardhat-viem/types';
import type { Address } from 'viem';

/**
 * Options for the transactions sent by the plugin's viem-based API, following
 * `@nomicfoundation/hardhat-viem` conventions.
 */
export type TransactionOptions = {
  /**
   * The clients to use, as in `@nomicfoundation/hardhat-viem`'s configuration objects.
   * The wallet client signs the transactions sent by the plugin and is the viem counterpart
   * of the contract factory's signer in the ethers-based API. Defaults to the first wallet
   * client from `connection.viem.getWalletClients()`.
   */
  client?: KeyedClient;

  /**
   * The gas limit for the transactions sent by the plugin.
   */
  gas?: bigint;

  /**
   * The gas price for the transactions sent by the plugin (legacy transactions).
   */
  gasPrice?: bigint;

  /**
   * The maximum fee per gas for the transactions sent by the plugin.
   */
  maxFeePerGas?: bigint;

  /**
   * The maximum priority fee per gas for the transactions sent by the plugin.
   */
  maxPriorityFeePerGas?: bigint;
};

/**
 * Addresses for unlinked libraries of a contract, as in `@nomicfoundation/hardhat-viem`'s
 * `libraries` configuration option.
 */
export interface Libraries {
  [libraryName: string]: Address;
}

/**
 * Option for providing the addresses of a contract's unlinked libraries.
 */
export type LibrariesOption = {
  /**
   * Addresses for unlinked libraries of the implementation contract, to enable linking.
   */
  libraries?: Libraries;
};

/**
 * Options for functions that can deploy an implementation contract.
 */
export type StandaloneOptions = StandaloneValidationOptions &
  DeployOpts &
  TransactionOptions &
  LibrariesOption & {
    constructorArgs?: unknown[];
    redeployImplementation?: 'always' | 'never' | 'onchange';
  };

/**
 * Options for functions that can deploy a new version of an implementation contract for upgrading.
 */
export type UpgradeOptions = ValidationOptions & StandaloneOptions;

type Initializer = {
  initializer?: string | false;
};

export type InitialOwner = {
  initialOwner?: Address;

  /**
   * Skips checking the `initialOwner` option when deploying a transparent proxy.
   */
  unsafeSkipProxyAdminCheck?: boolean;
};

export type DeployBeaconProxyOptions = TransactionOptions & DeployOpts & ProxyKindOption & Initializer;
export type DeployBeaconOptions = StandaloneOptions & InitialOwner;
export type DeployImplementationOptions = StandaloneOptions;
export type DeployProxyOptions = StandaloneOptions & Initializer & InitialOwner;
export type ForceImportOptions = ProxyKindOption & LibrariesOption;
export type PrepareUpgradeOptions = UpgradeOptions;
export type UpgradeBeaconOptions = UpgradeOptions;
export type UpgradeProxyOptions = UpgradeOptions & {
  call?: { fn: string; args?: unknown[] } | string;
};
export type ValidateImplementationOptions = StandaloneValidationOptions & LibrariesOption;
export type ValidateUpgradeOptions = ValidationOptions & LibrariesOption;
