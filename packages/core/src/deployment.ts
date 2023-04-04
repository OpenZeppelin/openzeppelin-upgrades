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

export interface DeploymentId {
  deploymentId?: string;
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
 * @param getDeploymentResponse a function to get the deployment response by id.
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
  getDeploymentResponse?: (deploymentId: string, allowUndefined: boolean) => Promise<DeploymentResponse | undefined>,
): Promise<T | U> {
  const validated = await validateCached(cached, provider, type, opts, deployment, merge, getDeploymentResponse);
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
  getDeploymentResponse?: (deploymentId: string, allowUndefined: boolean) => Promise<DeploymentResponse | undefined>,
): Promise<T | undefined> {
  if (cached !== undefined) {
    try {
      return await validateStoredDeployment(cached, provider, type, opts, merge, getDeploymentResponse);
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
  } else {
    return undefined;
  }
}

async function validateStoredDeployment<T extends Deployment & DeploymentId>(
  stored: T,
  provider: EthereumProvider,
  type?: string,
  opts?: DeployOpts,
  merge?: boolean,
  getDeploymentResponse?: (deploymentId: string, allowUndefined: boolean) => Promise<DeploymentResponse | undefined>,
): Promise<T> {
  const { txHash, deploymentId } = stored;
  let deployment = stored;

  if (txHash !== undefined) {
    // If there is a deployment with txHash stored, we look its transaction up. If the
    // transaction is found, the deployment is reused.
    debug('found previous deployment', txHash);
    const tx = await getTransactionByHash(provider, txHash);
    let foundDeployment = undefined;
    if (tx !== null) {
      foundDeployment = txHash;
    } else if (deploymentId !== undefined && getDeploymentResponse !== undefined) {
      // If the transaction is not found, try checking the deployment id since the transaction may have been replaced
      const response = await getDeploymentResponse(deploymentId, true);
      if (response !== undefined) {
        foundDeployment = deploymentId;

        // update the stored tx hash
        deployment = { ...stored, txHash: response.txHash };
        debug('updating previous deployment to tx hash ', response.txHash);
      }
    }

    if (foundDeployment) {
      debug('resuming previous deployment', foundDeployment);
      if (merge) {
        // If merging, wait for the existing deployment to be mined
        waitAndValidateDeployment(provider, deployment, type, opts, getDeploymentResponse);
      }
    } else {
      // If the transaction is not found we throw an error, except if we're in
      // a development network then we simply silently redeploy.
      // This error should be caught by the caller to determine if we're in a dev network.
      throw new InvalidDeployment(deployment);
    }
  } else {
    const existingBytecode = await getCode(provider, deployment.address);
    if (isEmpty(existingBytecode)) {
      throw new InvalidDeployment(deployment);
    }
  }
  return deployment;
}

export interface DeploymentResponse {
  status: string;
  txHash: string;
}

export async function waitAndValidateDeployment(
  provider: EthereumProvider,
  deployment: Deployment & DeploymentId,
  type?: string,
  opts?: DeployOpts,
  getDeploymentResponse?: (deploymentId: string, allowUndefined: boolean) => Promise<DeploymentResponse | undefined>,
): Promise<void> {
  const { txHash, address, deploymentId } = deployment;

  // Poll for 60 seconds with a 5 second poll interval by default.
  const pollTimeout = opts?.timeout ?? 60e3;
  const pollInterval = opts?.pollingInterval ?? 5e3;

  debug('polling timeout', pollTimeout, 'polling interval', pollInterval);

  let foundCode = false;

  if (deploymentId !== undefined && getDeploymentResponse !== undefined) {
    const startTime = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (await hasCode(provider, address)) {
        debug('code in target address found', address);
        foundCode = true;
        break;
      }

      const completed = await isDeploymentCompleted(address, deploymentId, allowUndefined =>
        getDeploymentResponse(deploymentId, allowUndefined),
      );
      if (completed) {
        break;
      } else {
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
  } else if (txHash !== undefined) {
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

  if (!foundCode) {
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
}

export class TransactionMinedTimeout extends UpgradesError {
  constructor(readonly deployment: Deployment & DeploymentId, type?: string, configurableTimeout?: boolean) {
    super(
      `Timed out waiting for ${type ? type + ' ' : ''}contract deployment to address ${deployment.address} with ${
        deployment.deploymentId ? `deployment id ${deployment.deploymentId}` : `transaction ${deployment.txHash}`
      }`,
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

/**
 * Checks if the deployment id is completed.
 *
 * @param address The expected address of the deployment.
 * @param deploymentId The deployment id.
 * @param getDeploymentResponse A function to get the deployment response.
 * @returns true if the deployment id is completed, false otherwise.
 * @throws {InvalidDeployment} if the deployment id failed.
 */
export async function isDeploymentCompleted(
  address: string,
  deploymentId: string,
  getDeploymentResponse: (allowUndefined: boolean) => Promise<DeploymentResponse | undefined>,
): Promise<boolean> {
  debug('verifying deployment id', deploymentId);
  const response = await getDeploymentResponse(false);
  if (response === undefined) {
    throw new Error(`Broken invariant: Response not found for deployment id ${deploymentId}`);
  }

  const status = response.status;
  if (status === 'completed') {
    debug('succeeded verifying deployment id completed', deploymentId);
    return true;
  } else if (status === 'failed') {
    debug(`deployment id ${deploymentId} failed with tx hash ${response.txHash}`);
    throw new InvalidDeployment({ address, txHash: response.txHash });
  } else if (status === 'submitted') {
    debug('waiting for deployment id to be completed', deploymentId);
    return false;
  } else {
    throw new Error(`Broken invariant: Unrecognized status ${status} for deployment id ${deploymentId}`);
  }
}
