import type {
  DeployOpts,
  ProxyKindOption,
  StandaloneValidationOptions,
  ValidationOptions,
} from '@openzeppelin/upgrades-core';
import type { KeyedClient } from '@nomicfoundation/hardhat-viem/types';
import type { Address } from 'viem';

import type { Call, Initializer, StandaloneOptions as EngineStandaloneOptions } from '../engine/options.js';

/**
 * Options for the transactions sent by the plugin's viem-based API, following
 * `@nomicfoundation/hardhat-viem` conventions.
 */
export type TransactionOptions = {
  /**
   * The clients to use, as in `@nomicfoundation/hardhat-viem`'s configuration objects.
   * The wallet client selects the account that signs the transactions sent by the plugin,
   * which must be an account managed by the network connection, and is the viem counterpart
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

  /**
   * The value to send with the transactions sent by the plugin, e.g. for a payable initializer.
   * Note that it is applied to every transaction the function sends, including the
   * implementation deployment if one takes place.
   */
  value?: bigint;
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
 *
 * Derived from the ethers-based options, replacing the ethers-typed `txOverrides` with
 * the viem-style `TransactionOptions`, and excluding the deprecated
 * `useDeployedImplementation` (use `redeployImplementation` instead).
 */
export type StandaloneOptions = Omit<EngineStandaloneOptions, 'useDeployedImplementation'> &
  TransactionOptions &
  LibrariesOption;

/**
 * Options for functions that can deploy a new version of an implementation contract for upgrading.
 */
export type UpgradeOptions = ValidationOptions & StandaloneOptions;

export type InitialOwner = {
  initialOwner?: Address;

  /**
   * Skips checking the `initialOwner` option when deploying a transparent proxy.
   */
  unsafeSkipProxyAdminCheck?: boolean;
};

/**
 * Options for the admin functions, which send a single transaction with the given wallet client.
 */
export type AdminOptions = Omit<TransactionOptions, 'client'>;

export type DeployBeaconProxyOptions = TransactionOptions & DeployOpts & ProxyKindOption & Initializer;
export type DeployBeaconOptions = StandaloneOptions & InitialOwner;
export type DeployImplementationOptions = StandaloneOptions;
export type DeployProxyOptions = StandaloneOptions & Initializer & InitialOwner;
export type ForceImportOptions = ProxyKindOption & LibrariesOption & Pick<TransactionOptions, 'client'>;
export type PrepareUpgradeOptions = UpgradeOptions;
export type UpgradeBeaconOptions = UpgradeOptions;
export type UpgradeProxyOptions = UpgradeOptions & { call?: Call };
export type ValidateImplementationOptions = StandaloneValidationOptions & LibrariesOption;
export type ValidateUpgradeOptions = ValidationOptions & LibrariesOption;
