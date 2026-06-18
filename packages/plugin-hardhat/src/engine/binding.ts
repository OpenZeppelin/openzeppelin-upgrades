import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { EthereumProvider } from 'hardhat/types/providers';
import type { Deployment, RemoteDeployment, RemoteDeploymentId } from '@openzeppelin/upgrades-core';

/**
 * The client-neutral engine for the Hardhat Upgrades plugin.
 *
 * The engine owns the upgrades logic and orchestration (validations, manifest, proxy-kind
 * inference, deciding what to deploy, sequencing the implementation + proxy/beacon deployment
 * from the vendored artifacts, recording results, and forceImport classification). It performs
 * no ABI encoding and constructs no transactions itself: those are delegated to a client
 * library through the {@link EngineBinding} seam supplied by each binding (ethers or viem).
 *
 * This module references neither `ethers` nor `viem` (nor their Hardhat plugins), so a project
 * that installs only one client's packages can still load and type-check the engine.
 */

/**
 * A JSON ABI, as accepted by both ethers (`new Interface(abi)`) and viem.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Abi = readonly any[];

/**
 * The client-neutral identity of a contract: its ABI and library-linked creation bytecode.
 * The binding builds this from an ethers `ContractFactory` (ethers) or from `hre.artifacts`
 * plus library linking (viem), and the engine never inspects it beyond passing it back to
 * the binding's encoding and deploy seams.
 */
export interface ContractInfo {
  abi: Abi;
  /** Library-linked creation bytecode, `0x`-prefixed. */
  bytecode: string;
}

/**
 * A non-deploy transaction request that the binding broadcasts through its client library.
 */
export interface TxRequest {
  to: string;
  data: string;
}

/**
 * The result of a deployment performed by the binding. `address` and `txHash` feed
 * `@openzeppelin/upgrades-core`'s manifest; `remoteDeploymentId` is set only by the Defender
 * path; `deployTransaction` is an opaque client object (the ethers `TransactionResponse`) that
 * the engine carries through untouched for the ethers binding to expose on its instances.
 */
export interface DeployedContract extends Deployment, RemoteDeploymentId {
  /** Opaque to the engine. The ethers binding stores its `TransactionResponse` here. */
  deployTransaction?: unknown;
}

/**
 * The result of a non-deploy transaction. `txHash` lets the viem binding await the receipt;
 * `txResponse` is an opaque client object (the ethers `TransactionResponse`) carried through for
 * the ethers binding to expose on its instances.
 */
export interface SentTransaction {
  txHash: string;
  /** Opaque to the engine. The ethers binding stores its `TransactionResponse` here. */
  txResponse?: unknown;
}

/**
 * The seam each client binding supplies to the engine. It encapsulates everything that
 * requires a specific client library: ABI encoding, deploying contracts (whether through a
 * local signer/wallet client or through Defender), and broadcasting plain transactions. The
 * engine drives all chain reads and receipt-waiting through {@link provider} and
 * `@openzeppelin/upgrades-core` directly, so those are client-neutral by construction.
 */
export interface EngineBinding {
  readonly hre: HardhatRuntimeEnvironment;
  /** The raw EIP-1193 provider (`connection.provider`), used for all reads and receipt-waiting. */
  readonly provider: EthereumProvider;

  /**
   * ABI-encodes a contract's constructor arguments (without the bytecode), as
   * `@openzeppelin/upgrades-core` needs to compute the deployment version.
   */
  encodeConstructorArgs(info: ContractInfo, args: readonly unknown[]): string;

  /**
   * ABI-encodes a function call's calldata, for initializers and upgrade calls.
   */
  encodeFunctionData(abi: Abi, fn: string, args: readonly unknown[]): string;

  /**
   * Returns whether the ABI has a function matching the given name or signature.
   */
  hasFunction(abi: Abi, fn: string): boolean;

  /**
   * Formats the ABI as recorded in the network manifest (informational only).
   */
  formatManifestAbi(abi: Abi): unknown;

  /**
   * The address of the account this binding signs with (the ethers factory's signer, or the
   * viem wallet client's account), used as the default `initialOwner` for transparent proxies
   * and beacons. `undefined` when no account is available.
   */
  getSignerAddress(): Promise<string | undefined>;

  /**
   * Deploys an implementation contract whose deployment is recorded and confirmed by the engine
   * through `@openzeppelin/upgrades-core`'s `fetchOrDeploy`. Returns as soon as the deployment
   * transaction is broadcast — with the eventual contract address — so the engine can record the
   * deployment before it is mined and core can confirm it afterwards, without the binding holding
   * the manifest lock while the contract mines. The ethers binding implements this as its normal
   * (already non-waiting) deploy; the viem binding predicts the address from the transaction nonce.
   */
  deployUnconfirmed(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract>;

  /**
   * Deploys a contract and, for the viem binding, waits until it is mined so the returned address is
   * immediately usable. Used for deployments the engine does not confirm itself: the beacon contract,
   * and standalone contracts for the ethers binding (which returns the pending transaction). For the
   * ethers binding with `useDefenderDeploy`, the deployment goes through Defender.
   */
  deploy(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract>;

  /**
   * Deploys a proxy or beacon-proxy contract. Identical to {@link deploy} for the viem binding,
   * but the ethers binding additionally honors its `proxyFactory` and `deployFunction` options
   * (the ethers-only escape hatches), so `info` is the engine's default (vendored) contract and
   * may be overridden by the binding. `args` are the proxy's constructor arguments.
   */
  deployProxy(info: ContractInfo, args: readonly unknown[]): Promise<DeployedContract>;

  /**
   * Broadcasts a non-deploy transaction (an upgrade or admin call) and returns its hash, plus an
   * opaque client transaction object for the ethers binding.
   */
  sendTransaction(tx: TxRequest): Promise<SentTransaction>;

  /**
   * Polls a remote deployment by id (the Defender path); `undefined` for the local path,
   * which is what removes the Defender dependency from the viem binding.
   */
  getRemoteDeployment?: (remoteDeploymentId: string) => Promise<RemoteDeployment | undefined>;
}
