import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType, KeyedClient, WalletClient } from '@nomicfoundation/hardhat-viem/types';
import type { Address } from 'viem';
import type { ContractFactory, Overrides, Signer, TransactionResponse } from 'ethers';
import { getAddress } from 'ethers';

import { UpgradesError } from '@openzeppelin/upgrades-core';

import type { Libraries, LibrariesOption, TransactionOptions } from './options.js';

// Load the `connection.viem` type extension of @nomicfoundation/hardhat-viem, which is loaded
// as a Hardhat plugin by the projects that use this module.
import type {} from '@nomicfoundation/hardhat-viem';

/**
 * A contract address, or a viem contract instance with an `address` property.
 */
export type ContractAddressOrInstance = Address | { address: Address };

/**
 * Asserts that the plugins required by the viem-based API are in use for the given connection:
 * @nomicfoundation/hardhat-viem to create the contract instances that the API returns, and
 * this plugin itself, which loads @nomicfoundation/hardhat-ethers for the internal machinery.
 */
export function assertRequiredPlugins(connection: NetworkConnection): void {
  if (connection === undefined || connection === null) {
    throw new UpgradesError(
      'A network connection is required.',
      () => 'Create a connection with `await hre.network.create()` and pass it to this function.',
    );
  }
  if (!('viem' in connection)) {
    throw new UpgradesError(
      'The viem-based API requires the @nomicfoundation/hardhat-viem plugin.',
      () =>
        'Install the @nomicfoundation/hardhat-viem and viem packages, and register @nomicfoundation/hardhat-viem in the `plugins` array of your Hardhat config.',
    );
  }
  if (!('ethers' in connection)) {
    throw new UpgradesError(
      'The viem-based API requires the @openzeppelin/hardhat-upgrades plugin.',
      () => 'Register @openzeppelin/hardhat-upgrades in the `plugins` array of your Hardhat config.',
    );
  }
}

export function getContractAddress(addressOrInstance: ContractAddressOrInstance): Address {
  if (typeof addressOrInstance === 'string') {
    return asAddress(addressOrInstance);
  } else {
    return asAddress(addressOrInstance.address);
  }
}

export function isAddress(value: string): value is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

/**
 * Returns the given address as a checksummed viem address, so that the addresses returned by
 * the viem-based API are consistently checksummed regardless of the caller's input case.
 * Throws if the value is not an address or has an invalid checksum, like the ethers-based
 * machinery does when given such a value.
 */
export function asAddress(value: string): Address {
  const checksummed = getAddress(value);
  if (!isAddress(checksummed)) {
    throw new Error(`Broken invariant: ${value} is not an address`);
  }
  return checksummed;
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
  if (walletClient.account === undefined || walletClient.account === null) {
    throw new UpgradesError(
      'The wallet client must have an account.',
      () =>
        'Use a wallet client from `connection.viem.getWalletClients()` or `connection.viem.getWalletClient(address)`.',
    );
  }
  // The plugin's transactions are signed by the network connection, so only accounts managed
  // by the connection are supported. Local accounts (such as those created with viem's
  // privateKeyToAccount) sign client-side and would fail with an obscure error at send time.
  if (walletClient.account.type !== 'json-rpc') {
    throw new UpgradesError(
      `Wallet clients with '${walletClient.account.type}' accounts are not supported.`,
      () =>
        'The plugin signs its transactions through the network connection, so the wallet client must use an account managed by the connection. ' +
        'Use a wallet client from `connection.viem.getWalletClients()` or `connection.viem.getWalletClient(address)`, ' +
        'or add the account to the `accounts` of your network configuration.',
    );
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

// The options of the viem-based API that have no ethers equivalent and must not be passed
// through to the ethers-based machinery. Typed as a record so that adding a member to
// TransactionOptions or LibrariesOption without handling it here is a compile error.
const VIEM_ONLY_OPTIONS: Record<keyof (Required<TransactionOptions> & Required<LibrariesOption>), true> = {
  client: true,
  gas: true,
  gasPrice: true,
  maxFeePerGas: true,
  maxPriorityFeePerGas: true,
  value: true,
  libraries: true,
};

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
  if (opts.value !== undefined) {
    overrides.value = opts.value;
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
  for (const key of Object.keys(VIEM_ONLY_OPTIONS)) {
    delete ethersOptions[key];
  }
  const txOverrides = toTxOverrides(opts);
  if (txOverrides !== undefined) {
    // Merge over a txOverrides object that may have been passed through from untyped code,
    // with the declared viem options taking precedence.
    const existing = ethersOptions.txOverrides;
    ethersOptions.txOverrides =
      typeof existing === 'object' && existing !== null ? { ...existing, ...txOverrides } : txOverrides;
  }
  // The viem-based API does not support OpenZeppelin Defender, so prevent the
  // `defender.useDefenderDeploy` Hardhat configuration from enabling it.
  ethersOptions.useDefenderDeploy = false;
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
 * Waits for the transaction that the ethers-based upgrade and beacon functions record on
 * the returned instance as the untyped `deployTransaction` property, so that the viem-based
 * API only returns once the transaction has been mined, like `connection.viem.deployContract`
 * does. For deployments, the wrappers instead await the instance's typed
 * `deploymentTransaction()` directly.
 */
export async function waitForAttachedTransaction(instance: object): Promise<void> {
  const tx = (instance as { deployTransaction?: TransactionResponse }).deployTransaction;
  await tx?.wait();
}
