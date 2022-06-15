import { promisify } from 'util';

import debug from './utils/debug';
import { makeNonEnumerable } from './utils/make-non-enumerable';
import {
  EthereumProvider,
  getCode,
  getTransactionByHash,
  getTransactionReceipt,
  hasCode,
  isDevelopmentNetwork,
  isEmpty,
  isReceiptSuccessful,
} from './provider';
import { UpgradesError } from './error';
import { deleteDeployment, ManifestField } from './impl-store';

const sleep = promisify(setTimeout);

export interface Deployment {
  address: string;
  txHash?: string;
}

export interface DeployOpts {
  /**
   * Timeout in milliseconds to wait for the transaction confirmation when deploying an implementation contract or proxy admin contract. Use `0` to wait indefinitely.
   */
  timeout?: number;

  /**
   * Polling interval in milliseconds between checks for the transaction confirmation when deploying an implementation contract or proxy admin contract.
   */
  pollingInterval?: number;
}

/**
 * Resumes a deployment or deploys a new one, based on whether the cached deployment should continue to be used and is valid
 * (has a valid txHash for the current network or has runtime bytecode).
 * If a cached deployment is not valid, deletes it if using a development network, otherwise throws an InvalidDeployment error.
 *
 * @param provider the Ethereum provider
 * @param cached the cached deployment
 * @param deploy the function to deploy a new deployment if needed
 * @param type the manifest lens type. If merge is true, used for the timeout message if a previous deployment is not
 *   confirmed within the timeout period. Otherwise not used.
 * @param opts polling timeout and interval options. If merge is true, used to check a previous deployment for confirmation.
 *   Otherwise not used.
 * @param deployment the manifest field for this deployment. Optional for backward compatibility.
 *   If not provided, invalid deployments will not be deleted in a dev network (which is not a problem if merge is false,
 *   since it will be overwritten with the new deployment).
 * @param merge whether the cached deployment is intended to be merged with the new deployment. Defaults to false.
 * @returns the cached deployment if it should be used, otherwise the new deployment from the deploy function
 * @throws {InvalidDeployment} if the cached deployment is invalid and we are not on a dev network
 */
export async function resumeOrDeploy<T extends Deployment, U extends T = T>(
  provider: EthereumProvider,
  cached: T | undefined,
  deploy: () => Promise<U>,
  type?: string,
  opts?: DeployOpts,
  deployment?: ManifestField<T>,
  merge?: boolean,
): Promise<T | U> {
  const validated = await validateCached(cached, provider, type, opts, deployment, merge);
  if (validated === undefined || merge) {
    const deployment = await deploy();
    debug('initiated deployment', 'transaction hash:', deployment.txHash, 'merge:', merge);
    return deployment;
  } else {
    return validated;
  }
}

async function validateCached<T extends Deployment>(
  cached: T | undefined,
  provider: EthereumProvider,
  type?: string,
  opts?: DeployOpts,
  deployment?: ManifestField<T>,
  merge?: boolean,
): Promise<T | undefined> {
  if (cached !== undefined) {
    try {
      await validateStoredDeployment(cached, provider, type, opts, merge);
    } catch (e) {
      if (e instanceof InvalidDeployment && (await isDevelopmentNetwork(provider))) {
        debug('ignoring invalid deployment in development network', e.deployment.address);
        if (deployment !== undefined) {
          deleteDeployment(deployment);
        }
        return undefined;
      } else {
        throw e;
      }
    }
  }
  return cached;
}

async function validateStoredDeployment<T extends Deployment>(
  stored: T,
  provider: EthereumProvider,
  type?: string,
  opts?: DeployOpts,
  merge?: boolean,
) {
  const { txHash } = stored;
  if (txHash !== undefined) {
    // If there is a deployment with txHash stored, we look its transaction up. If the
    // transaction is found, the deployment is reused.
    debug('found previous deployment', txHash);
    const tx = await getTransactionByHash(provider, txHash);
    if (tx !== null) {
      debug('resuming previous deployment', txHash);
      if (merge) {
        // If merging, wait for the existing deployment to be mined
        waitAndValidateDeployment(provider, stored, type, opts);
      }
    } else {
      // If the transaction is not found we throw an error, except if we're in
      // a development network then we simply silently redeploy.
      // This error should be caught by the caller to determine if we're in a dev network.
      throw new InvalidDeployment(stored);
    }
  } else {
    const existingBytecode = await getCode(provider, stored.address);
    if (isEmpty(existingBytecode)) {
      throw new InvalidDeployment(stored);
    }
  }
}

export async function waitAndValidateDeployment(
  provider: EthereumProvider,
  deployment: Deployment,
  type?: string,
  opts?: DeployOpts,
): Promise<void> {
  const { txHash, address } = deployment;

  // Poll for 60 seconds with a 5 second poll interval by default.
  const pollTimeout = opts?.timeout ?? 60e3;
  const pollInterval = opts?.pollingInterval ?? 5e3;

  debug('polling timeout', pollTimeout, 'polling interval', pollInterval);

  if (txHash !== undefined) {
    const startTime = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      debug('verifying deployment tx mined', txHash);
      const receipt = await getTransactionReceipt(provider, txHash);
      if (receipt && isReceiptSuccessful(receipt)) {
        debug('succeeded verifying deployment tx mined', txHash);
        break;
      } else if (receipt) {
        debug('tx was reverted', txHash);
        throw new InvalidDeployment(deployment);
      } else {
        debug('waiting for deployment tx mined', txHash);
        await sleep(pollInterval);
      }
      if (pollTimeout != 0) {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= pollTimeout) {
          // A timeout is NOT an InvalidDeployment
          throw new TransactionMinedTimeout(deployment, type, !!opts);
        }
      }
    }
  }

  debug('verifying code in target address', address);
  const startTime = Date.now();
  while (!(await hasCode(provider, address))) {
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime >= pollTimeout || txHash === undefined) {
      throw new InvalidDeployment(deployment);
    }
    await sleep(pollInterval);
  }
  debug('code in target address found', address);
}

export class TransactionMinedTimeout extends UpgradesError {
  constructor(readonly deployment: Deployment, type?: string, configurableTimeout?: boolean) {
    super(
      `Timed out waiting for ${type ? type + ' ' : ''}contract deployment to address ${
        deployment.address
      } with transaction ${deployment.txHash}`,
      () =>
        'Run the function again to continue waiting for the transaction confirmation.' +
        (configurableTimeout
          ? ' If the problem persists, adjust the polling parameters with the timeout and pollingInterval options.'
          : ''),
    );
  }
}

export class InvalidDeployment extends Error {
  removed = false;

  constructor(readonly deployment: Deployment) {
    super();
    // This hides the properties from the error when it's printed.
    makeNonEnumerable(this, 'removed');
    makeNonEnumerable(this, 'deployment');
  }

  get message(): string {
    let msg = `No contract at address ${this.deployment.address}`;
    if (this.removed) {
      msg += ' (Removed from manifest)';
    }
    return msg;
  }
}
