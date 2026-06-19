import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import type { StringWithArtifactContractNamesAutocompletion } from 'hardhat/types/artifacts';
import type { ContractReturnType, KeyedClient, WalletClient } from '@nomicfoundation/hardhat-viem/types';
import type { Address } from 'viem';
import { getAddress, getContract } from 'viem';
import { resolveLinkedBytecode } from '@nomicfoundation/hardhat-utils/bytecode';

import { UpgradesError } from '@openzeppelin/upgrades-core';

import type { ContractInfo, EngineBinding } from '../engine/binding.js';
import { makeViemBinding, ViemExecOptions } from './viem-binding.js';
import type { Libraries, TransactionOptions } from './options.js';

// Load the `connection.viem` type extension of @nomicfoundation/hardhat-viem, which is loaded
// as a Hardhat plugin by the projects that use this module.
import type {} from '@nomicfoundation/hardhat-viem';

/**
 * A contract address, or a viem contract instance with an `address` property.
 */
export type ContractAddressOrInstance = Address | { address: Address };

/**
 * Asserts that the plugins required by the viem-based API are in use for the given connection:
 * @nomicfoundation/hardhat-viem, which creates the contract instances that the API returns and
 * signs and broadcasts the plugin's transactions.
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
 * Throws if the value is not an address or has an invalid checksum.
 */
export function asAddress(value: string): Address {
  const checksummed = getAddress(value);
  if (!isAddress(checksummed)) {
    throw new Error(`Broken invariant: ${value} is not an address`);
  }
  return checksummed;
}

/**
 * Resolves the wallet client whose account signs the transactions sent by the plugin: the given
 * wallet client, or by default the first wallet client of the connection. Unlike the previous
 * implementation, accounts that sign client-side (viem local accounts) are supported, since the
 * plugin now signs through viem itself.
 */
export async function resolveWalletClient(
  connection: NetworkConnection,
  walletClient: WalletClient | undefined,
): Promise<WalletClient> {
  const resolved = walletClient ?? (await connection.viem.getWalletClients())[0];
  if (resolved === undefined) {
    throw new UpgradesError(
      'No wallet client is available.',
      () => 'Provide a wallet client with the `client` option, or configure accounts for the network connection.',
    );
  }
  if (resolved.account === undefined || resolved.account === null) {
    throw new UpgradesError(
      'The wallet client must have an account.',
      () =>
        'Use a wallet client from `connection.viem.getWalletClients()` or `connection.viem.getWalletClient(address)`.',
    );
  }
  return resolved;
}

/**
 * Builds the engine binding for the viem-based API from the options' wallet client and transaction
 * parameters.
 */
export async function makeBinding(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
  opts: TransactionOptions = {},
): Promise<EngineBinding> {
  const walletClient = await resolveWalletClient(connection, opts.client?.wallet);
  return makeViemBinding(hre, connection, walletClient, execOptions(opts));
}

/**
 * Builds the engine binding for read-only operations (validations, force-import) that never sign a
 * transaction, so they work even when the connection has no accounts. Uses the options' wallet
 * client if one is given, otherwise the connection's first wallet client if available.
 */
export async function makeReadBinding(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
  opts: { client?: KeyedClient } = {},
): Promise<EngineBinding> {
  const candidate = opts.client?.wallet ?? (await connection.viem.getWalletClients())[0];
  const walletClient = candidate?.account ? candidate : undefined;
  return makeViemBinding(hre, connection, walletClient, {});
}

/**
 * Extracts the transaction parameters from the viem-based options.
 */
export function execOptions(
  opts: TransactionOptions & { timeout?: number; pollingInterval?: number },
): ViemExecOptions {
  return {
    value: opts.value,
    gas: opts.gas,
    gasPrice: opts.gasPrice,
    maxFeePerGas: opts.maxFeePerGas,
    maxPriorityFeePerGas: opts.maxPriorityFeePerGas,
    timeout: opts.timeout,
    pollingInterval: opts.pollingInterval,
  };
}

/**
 * Reads the contract's ABI and library-linked creation bytecode from the project artifacts,
 * for use as the engine's client-neutral contract identity.
 */
export async function getContractInfo(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  libraries: Libraries = {},
): Promise<ContractInfo> {
  const artifact = await hre.artifacts.readArtifact(contractName);
  const bytecode = resolveLinkedBytecode(artifact, libraries);
  return { abi: artifact.abi, bytecode };
}

/**
 * Reads only a contract's ABI from the project artifacts, for functions that use the ABI to encode
 * an initializer call but never deploy the contract's bytecode.
 */
export async function getAbi(hre: HardhatRuntimeEnvironment, contractName: string) {
  const artifact = await hre.artifacts.readArtifact(contractName);
  return artifact.abi;
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
 * Builds a viem contract instance at `address` for the given ABI, usable for reads even when the
 * connection has no accounts. A wallet client (the provided one, or the connection's first account)
 * enables writes; without one the instance is read-only — so attaching to an existing contract does
 * not require an account, mirroring the ethers-based API. Used by `forceImport`, which records the
 * deployment without needing an account and so must be able to return an instance without one.
 */
export async function attachViemContract<ContractName extends StringWithArtifactContractNamesAutocompletion>(
  connection: NetworkConnection,
  abi: ContractInfo['abi'],
  address: Address,
  client?: KeyedClient,
): Promise<ContractReturnType<ContractName>> {
  const [publicClient, walletClient] = await Promise.all([
    client?.public ?? connection.viem.getPublicClient(),
    client?.wallet ?? connection.viem.getWalletClients().then(clients => clients[0]),
  ]);
  const contract =
    walletClient !== undefined
      ? getContract({ address, abi, client: { public: publicClient, wallet: walletClient } })
      : getContract({ address, abi, client: { public: publicClient } });
  return contract as unknown as ContractReturnType<ContractName>;
}
