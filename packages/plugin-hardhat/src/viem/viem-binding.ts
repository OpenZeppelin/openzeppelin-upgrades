import { encodeDeployData, encodeFunctionData as viemEncodeFunctionData, getAddress, toFunctionSignature } from 'viem';
import type { Abi as ViemAbi, AbiFunction, Hex } from 'viem';
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
  const send = (request: { to?: string; data: string }): Promise<Hex> => {
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

  return {
    hre,
    provider,

    encodeConstructorArgs(info: ContractInfo, args: readonly unknown[]): string {
      // Encode only the constructor arguments (no bytecode) for the version hash.
      return encodeDeployData({
        abi: info.abi as ViemAbi,
        bytecode: '0x',
        ...(args.length > 0 ? { args: args as readonly unknown[] } : {}),
      } as Parameters<typeof encodeDeployData>[0]);
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

    async deploy(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract> {
      const data = encodeDeployData({
        abi: info.abi as ViemAbi,
        bytecode: info.bytecode as Hex,
        ...(args.length > 0 ? { args: args as readonly unknown[] } : {}),
      } as Parameters<typeof encodeDeployData>[0]);
      const txHash = await send({ data });
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
