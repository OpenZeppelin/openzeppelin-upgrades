import {
  encodeAbiParameters,
  encodeDeployData,
  encodeFunctionData as viemEncodeFunctionData,
  getAddress,
  getContractAddress,
  toFunctionSignature,
} from 'viem';
import type { Abi as ViemAbi, AbiFunction, AbiParameter, Hex } from 'viem';
import type { WalletClient } from '@nomicfoundation/hardhat-viem/types';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';

import { UpgradesError } from '@openzeppelin/upgrades-core';

import type {
  Abi,
  ContractInfo,
  DeployedContract,
  EngineBinding,
  SentTransaction,
  TxRequest,
} from '../engine/binding.js';
import { waitForReceipt } from '../engine/receipt.js';

/**
 * Transaction parameters the viem binding applies to every transaction it sends, mirroring
 * `@nomicfoundation/hardhat-viem`'s conventions.
 */
export interface ViemExecOptions {
  value?: bigint;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  timeout?: number;
  pollingInterval?: number;
}

/**
 * Builds the client-neutral engine binding for the viem API. All transactions are signed and
 * broadcast through the given wallet client, so viem local accounts (private key, mnemonic, KMS,
 * hardware) are supported natively — viem's own `sendTransaction` branches on the account type.
 */
export function makeViemBinding(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
  walletClient: WalletClient | undefined,
  exec: ViemExecOptions,
): EngineBinding {
  const provider = connection.provider;

  const overrides = {
    ...(exec.value !== undefined ? { value: exec.value } : {}),
    ...(exec.gas !== undefined ? { gas: exec.gas } : {}),
    ...(exec.gasPrice !== undefined ? { gasPrice: exec.gasPrice } : {}),
    ...(exec.maxFeePerGas !== undefined ? { maxFeePerGas: exec.maxFeePerGas } : {}),
    ...(exec.maxPriorityFeePerGas !== undefined ? { maxPriorityFeePerGas: exec.maxPriorityFeePerGas } : {}),
  };
  const waitOpts = { timeout: exec.timeout, pollingInterval: exec.pollingInterval };

  type SendParams = Parameters<WalletClient['sendTransaction']>[0];
  const send = (request: { to?: string; data: string; nonce?: number }): Promise<Hex> => {
    if (walletClient === undefined) {
      // Read-only bindings (validation, force-import) never reach here.
      throw new UpgradesError('Broken invariant: a transaction was sent without a wallet client');
    }
    return walletClient.sendTransaction({
      account: walletClient.account,
      ...request,
      ...overrides,
    } as unknown as SendParams);
  };

  const broadcastDeploy = (info: ContractInfo, args: readonly unknown[], nonce?: number): Promise<Hex> =>
    send({
      data: encodeDeployData({
        abi: info.abi as ViemAbi,
        bytecode: info.bytecode as Hex,
        ...(args.length > 0 ? { args: args as readonly unknown[] } : {}),
      } as Parameters<typeof encodeDeployData>[0]),
      ...(nonce !== undefined ? { nonce } : {}),
    });

  return {
    hre,
    provider,

    encodeConstructorArgs(info: ContractInfo, args: readonly unknown[]): string {
      // Validate the constructor argument count up front and ABI-encode just the arguments (no
      // bytecode) for the version hash. viem's `encodeDeployData` silently returns the bytecode
      // unchanged when no args are passed, so a contract with required constructor parameters
      // deployed without `constructorArgs` would otherwise be encoded with no arguments instead of
      // failing — `encodeAbiParameters` throws on a length mismatch, matching the ethers binding.
      const inputs = constructorInputs(info.abi);
      if (inputs.length !== args.length) {
        throw new UpgradesError(
          `Expected ${inputs.length} constructor argument(s) but got ${args.length}`,
          () => "Provide the implementation contract's constructor arguments with the `constructorArgs` option.",
        );
      }
      if (inputs.length === 0) {
        return '0x';
      }
      return encodeAbiParameters(inputs, args as readonly unknown[]);
    },

    encodeFunctionData(abi: Abi, fn: string, args: readonly unknown[]): string {
      if (fn.includes('(')) {
        const item = findBySignature(abi, fn);
        if (item === undefined) {
          throw new UpgradesError(`The contract has no function matching the signature: ${fn}`);
        }
        return viemEncodeFunctionData({ abi: [item] as ViemAbi, functionName: item.name, args: args as unknown[] });
      }
      return viemEncodeFunctionData({ abi: abi as ViemAbi, functionName: fn, args: args as unknown[] });
    },

    hasFunction(abi: Abi, fn: string): boolean {
      if (fn.includes('(')) {
        return findBySignature(abi, fn) !== undefined;
      }
      return abi.some(item => item.type === 'function' && item.name === fn);
    },

    formatManifestAbi(abi: Abi): unknown {
      return abi;
    },

    async getSignerAddress(): Promise<string | undefined> {
      return walletClient?.account?.address;
    },

    async deployUnconfirmed(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract> {
      // Determine the eventual address before broadcasting: read the sender's pending nonce, send the
      // deployment with that explicit nonce, and compute the CREATE address from `(from, nonce)`
      // locally — the address depends only on the sender and nonce, not on the bytecode or arguments.
      // This mirrors how the ethers binding deploys, and unlike querying the chain for the transaction
      // after broadcasting it leaves no step that can fail between the (irreversible) broadcast and
      // returning the record, so the engine always records the deployment before it is mined.
      // `@openzeppelin/upgrades-core` then confirms it outside the manifest lock, so the lock is not
      // held while the contract mines.
      const account = walletClient?.account;
      if (account === undefined) {
        // Read-only bindings (validation, force-import) never reach here.
        throw new UpgradesError('Broken invariant: a transaction was sent without a wallet client');
      }
      const publicClient = await connection.viem.getPublicClient();
      const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });
      const txHash = await broadcastDeploy(info, args, nonce);
      return { address: getContractAddress({ from: account.address, nonce: BigInt(nonce) }), txHash };
    },

    async deploy(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract> {
      // Wait for the receipt so the returned address is immediately usable. Used for deployments the
      // engine does not confirm itself (the beacon contract); proxies go through `deployProxy`.
      const txHash = await broadcastDeploy(info, args);
      const receipt = await waitForReceipt(provider, txHash, waitOpts);
      if (receipt.contractAddress === undefined || receipt.contractAddress === null) {
        throw new UpgradesError(`Deployment transaction ${txHash} did not create a contract`);
      }
      return { address: getAddress(receipt.contractAddress), txHash };
    },

    deployProxy(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract> {
      // The viem API has no `proxyFactory`/`deployFunction` escape hatches, so proxies deploy the
      // same way as any other contract.
      return this.deploy(info, args);
    },

    async sendTransaction(tx: TxRequest): Promise<SentTransaction> {
      const txHash = await send({ to: tx.to, data: tx.data });
      await waitForReceipt(provider, txHash, waitOpts);
      return { txHash };
    },
  };
}

function findBySignature(abi: Abi, signature: string): AbiFunction | undefined {
  return abi.find((item): item is AbiFunction => item.type === 'function' && toFunctionSignature(item) === signature);
}

// `Abi` is intentionally untyped (`readonly any[]`, see engine/binding.ts), so describe just the
// part of a constructor entry this helper reads. The type guard then narrows the found item and
// keeps `inputs` typed without asserting the whole ABI.
type ConstructorAbiItem = { type: 'constructor'; inputs?: readonly AbiParameter[] };

function constructorInputs(abi: Abi): readonly AbiParameter[] {
  const constructor = abi.find((item): item is ConstructorAbiItem => item.type === 'constructor');
  return constructor?.inputs ?? [];
}
