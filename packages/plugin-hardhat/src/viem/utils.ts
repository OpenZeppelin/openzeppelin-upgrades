import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType, KeyedClient, WalletClient } from '@nomicfoundation/hardhat-viem/types';
import type { Address } from 'viem';
import type { ContractFactory, Overrides, Signer, TransactionResponse } from 'ethers';

import { UpgradesError } from '@openzeppelin/upgrades-core';

import type { Libraries, TransactionOptions } from './options.js';

// Load the `connection.viem` type extension of @nomicfoundation/hardhat-viem, which is loaded
// as a Hardhat plugin by the projects that use this module.
import type {} from '@nomicfoundation/hardhat-viem';

/**
 * A contract address, or a viem contract instance with an `address` property.
 */
export type ContractAddressOrInstance = Address | { address: Address };

/**
 * Asserts that the @nomicfoundation/hardhat-viem plugin is in use for the given connection.
 * The viem-based API requires it to create the contract instances that it returns.
 */
export function assertHardhatViem(connection: NetworkConnection): void {
  if ((connection as { viem?: unknown }).viem === undefined) {
    throw new UpgradesError(
      'The viem-based API requires the @nomicfoundation/hardhat-viem plugin.',
      () =>
        'Install the @nomicfoundation/hardhat-viem and viem packages, and register @nomicfoundation/hardhat-viem in the `plugins` array of your Hardhat config.',
    );
  }
}

export function getContractAddress(addressOrInstance: ContractAddressOrInstance): Address {
  if (typeof addressOrInstance === 'string') {
    return addressOrInstance;
  } else {
    return addressOrInstance.address;
  }
}

export function isAddress(value: string): value is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

/**
 * Gets the ethers signer corresponding to the wallet client, to drive the internal
 * ethers-based machinery with the account that hardhat-viem conventions select:
 * the given wallet client's account, or by default the first account.
 *
 * Note that when this returns undefined, the internal ethers-based machinery defaults
 * to the first signer, which is the same account as the default wallet client.
 */
export async function getSigner(
  connection: NetworkConnection,
  walletClient: WalletClient | undefined,
): Promise<Signer | undefined> {
  if (walletClient === undefined) {
    return undefined;
  }
  return connection.ethers.getSigner(walletClient.account.address);
}

/**
 * Gets an ethers contract factory for the named contract, connected to the signer that
 * corresponds to the options' wallet client. The factory is only used internally; the
 * viem-based API never exposes it.
 */
export async function getContractFactory(
  connection: NetworkConnection,
  contractName: string,
  opts: { client?: KeyedClient; libraries?: Libraries } = {},
): Promise<ContractFactory> {
  const signer = await getSigner(connection, opts.client?.wallet);
  return connection.ethers.getContractFactory(contractName, { signer, libraries: opts.libraries });
}

/**
 * Gets an ethers contract factory carrying only the ABI of the named contract, for functions
 * that use the factory's interface and signer but never deploy its bytecode. This avoids
 * requiring library addresses for contracts with unlinked libraries.
 */
export async function getInterfaceFactory(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
  contractName: string,
  opts: { client?: KeyedClient } = {},
): Promise<ContractFactory> {
  const artifact = await hre.artifacts.readArtifact(contractName);
  const signer = await getSigner(connection, opts.client?.wallet);
  return connection.ethers.getContractFactory(artifact.abi, '0x', signer);
}

/**
 * Converts the viem-style transaction options to ethers overrides for the internal
 * ethers-based machinery.
 */
function toTxOverrides(opts: TransactionOptions): Overrides | undefined {
  const overrides: Overrides = {};
  if (opts.gas !== undefined) {
    overrides.gasLimit = opts.gas;
  }
  if (opts.gasPrice !== undefined) {
    overrides.gasPrice = opts.gasPrice;
  }
  if (opts.maxFeePerGas !== undefined) {
    overrides.maxFeePerGas = opts.maxFeePerGas;
  }
  if (opts.maxPriorityFeePerGas !== undefined) {
    overrides.maxPriorityFeePerGas = opts.maxPriorityFeePerGas;
  }
  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

/**
 * Converts options of the viem-based API to options for the internal ethers-based machinery:
 * replaces the viem-specific options with the equivalent ethers transaction overrides, and
 * passes all the client-agnostic options through.
 */
export function toEthersOptions<T>(opts: TransactionOptions & { libraries?: Libraries }): T {
  const ethersOptions: Record<string, unknown> = { ...opts };
  delete ethersOptions.client;
  delete ethersOptions.libraries;
  delete ethersOptions.gas;
  delete ethersOptions.gasPrice;
  delete ethersOptions.maxFeePerGas;
  delete ethersOptions.maxPriorityFeePerGas;
  const txOverrides = toTxOverrides(opts);
  if (txOverrides !== undefined) {
    ethersOptions.txOverrides = txOverrides;
  }
  return ethersOptions as T;
}

/**
 * Gets a viem contract instance for the named contract at the given address, using
 * `connection.viem.getContractAt` so that the result follows hardhat-viem conventions.
 */
export async function getViemContractAt<ContractName extends StringWithArtifactContractNamesAutocompletion>(
  connection: NetworkConnection,
  contractName: ContractName,
  address: Address,
  client?: KeyedClient,
): Promise<ContractReturnType<ContractName>> {
  return connection.viem.getContractAt(contractName, address, client !== undefined ? { client } : undefined);
}

/**
 * Waits for the transaction that the internal ethers-based machinery recorded on a contract
 * instance, so that the viem-based API only returns once the transaction has been mined,
 * like `connection.viem.deployContract` does.
 */
export async function waitForPendingTransaction(instance: object): Promise<void> {
  let tx: TransactionResponse | null | undefined;
  if ('deploymentTransaction' in instance && typeof instance.deploymentTransaction === 'function') {
    tx = instance.deploymentTransaction() as TransactionResponse | null;
  }
  // upgradeProxy, upgradeBeacon, and deployBeacon record the transaction as a property instead.
  if (!tx && 'deployTransaction' in instance) {
    tx = instance.deployTransaction as TransactionResponse | undefined;
  }
  await tx?.wait();
}
