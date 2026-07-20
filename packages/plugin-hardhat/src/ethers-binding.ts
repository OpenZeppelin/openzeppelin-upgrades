import { Interface } from 'ethers';
import type { ContractRunner, InterfaceAbi, TransactionResponse } from 'ethers';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';

import type {
  Abi,
  ContractInfo,
  DeployedContract,
  EngineBinding,
  SentTransaction,
  TxRequest,
} from './engine/binding.js';
import { deploy, EthersOrDefenderDeployment } from './utils/deploy.js';
import { getSigner } from './utils/ethers.js';
import { getRemoteDeployment } from './defender/utils.js';
import type { DeployFactoryOpts, DefenderDeployOptions, EthersDeployOptions, UpgradeOptions } from './utils/options.js';

/**
 * The options the ethers binding needs from the public ethers API: the engine-neutral options
 * plus ethers/Defender-specific transaction overrides and the proxy escape hatches.
 */
export type EthersBindingOptions = UpgradeOptions & EthersDeployOptions & DefenderDeployOptions & DeployFactoryOpts;

/**
 * Builds the client-neutral engine binding for the ethers API. Deployments still go through the
 * ethers `ContractFactory` (preserving the existing behavior, including the Defender path and the
 * `proxyFactory`/`deployFunction` escape hatches), while the engine drives the orchestration.
 *
 * @param runner the contract factory's runner, whose signer signs the plugin's transactions
 */
export function makeEthersBinding(
  hre: HardhatRuntimeEnvironment,
  connection: NetworkConnection,
  runner: ContractRunner | null | undefined,
  opts: EthersBindingOptions,
): EngineBinding {
  const signer = getSigner(runner);

  return {
    hre,
    provider: connection.provider,

    encodeConstructorArgs(info: ContractInfo, args: readonly unknown[]): string {
      return new Interface(info.abi as InterfaceAbi).encodeDeploy(args as unknown[]);
    },

    encodeFunctionData(abi: Abi, fn: string, args: readonly unknown[]): string {
      return new Interface(abi as InterfaceAbi).encodeFunctionData(fn, args as unknown[]);
    },

    hasFunction(abi: Abi, fn: string): boolean {
      return new Interface(abi as InterfaceAbi).getFunction(fn) !== null;
    },

    formatManifestAbi(abi: Abi): unknown {
      return new Interface(abi as InterfaceAbi).format(true);
    },

    async getSignerAddress(): Promise<string | undefined> {
      return signer === undefined ? undefined : await signer.getAddress();
    },

    deployUnconfirmed(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract> {
      // ethers' deploy already returns the pending transaction without waiting for the receipt, so
      // upgrades-core confirms it the same way; there is nothing different to do for ethers.
      return this.deploy(info, args);
    },

    async deploy(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract> {
      const factory = await connection.ethers.getContractFactory([...info.abi], info.bytecode, signer);
      return toDeployedContract(await deploy(hre, opts, factory, ...args));
    },

    async deployProxy(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract> {
      // Build the proxy factory the way the previous implementation did, falling back to the
      // connection's default signer when the implementation factory has no signer.
      const factory =
        opts.proxyFactory ?? (await connection.ethers.getContractFactory([...info.abi], info.bytecode, signer));
      const deployFn = opts.deployFunction || deploy;
      return toDeployedContract(await deployFn(hre, opts, factory, ...args));
    },

    async sendTransaction(tx: TxRequest): Promise<SentTransaction> {
      // The signer that signs the plugin's transactions, falling back to the connection's default
      // signer to match `connection.ethers.getContractAt(...)` when no factory signer is available.
      const txSigner = signer ?? (await connection.ethers.provider.getSigner());
      const overrides = opts.txOverrides ?? {};
      // Apply overrides first so caller-supplied `to`/`data` cannot replace the plugin's call.
      const response = await txSigner.sendTransaction({ ...overrides, to: tx.to, data: tx.data });
      return { txHash: response.hash, txResponse: response };
    },

    getRemoteDeployment: remoteDeploymentId => getRemoteDeployment(hre, remoteDeploymentId),
  };
}

/**
 * Builds the engine's client-neutral {@link ContractInfo} from an ethers `ContractFactory`.
 */
export function contractInfo(factory: { interface: Interface; bytecode: string }): ContractInfo {
  return {
    abi: JSON.parse(factory.interface.formatJson()) as Abi,
    bytecode: factory.bytecode,
  };
}

function toDeployedContract(deployment: EthersOrDefenderDeployment): DeployedContract {
  return {
    address: deployment.address,
    txHash: deployment.txHash,
    deployTransaction: deployment.deployTransaction,
    remoteDeploymentId: deployment.remoteDeploymentId,
  };
}

/**
 * Resolves the ethers `TransactionResponse` of an implementation deployment for the `getTxResponse`
 * option: the deployment's own transaction when freshly deployed, or otherwise the transaction
 * looked up from the manifest's recorded hash.
 */
export async function txResponseOf(
  deployment: DeployedContract,
  connection: NetworkConnection,
): Promise<TransactionResponse | undefined> {
  if (deployment.deployTransaction !== undefined) {
    return deployment.deployTransaction as TransactionResponse;
  }
  if (deployment.txHash !== undefined) {
    return (await connection.ethers.provider.getTransaction(deployment.txHash)) ?? undefined;
  }
  return undefined;
}
