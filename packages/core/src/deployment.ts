import { promisify } from 'util';

import debug from './utils/debug';
import { makeNonEnumerable } from './utils/make-non-enumerable';
import { EthereumProvider, getTransactionByHash, hasCode, isDevelopmentNetwork } from './provider';

const sleep = promisify(setTimeout);

export interface Deployment {
  address: string;
  txHash?: string;
}

export async function resumeOrDeploy<T extends Deployment>(
  provider: EthereumProvider,
  cached: T | undefined,
  deploy: () => Promise<T>,
): Promise<T> {
  if (cached !== undefined) {
    const { txHash } = cached;
    if (txHash === undefined) {
      // Nothing to do here without a txHash.
      // This is the case for deployments migrated from OpenZeppelin CLI.
      return cached;
    }
    // If there is a deployment with txHash stored, we look its transaction up. If the
    // transaction is found, the deployment is reused.
    debug('found previous deployment', txHash);
    const tx = await getTransactionByHash(provider, txHash);
    if (tx !== null) {
      debug('resuming previous deployment', txHash);
      return cached;
    } else if (!(await isDevelopmentNetwork(provider))) {
      // If the transaction is not found we throw an error, except if we're in
      // a development network then we simply silently redeploy.
      throw new InvalidDeployment(cached);
    } else {
      debug('ignoring invalid deployment in development network', txHash);
    }
  }

  const deployment = await deploy();
  debug('initiated deployment', deployment.txHash);
  return deployment;
}

export async function waitAndValidateDeployment(provider: EthereumProvider, deployment: Deployment): Promise<void> {
  const { txHash, address } = deployment;
  const startTime = Date.now();

  if (txHash !== undefined) {
    // Poll for 60 seconds with a 5 second poll interval.
    // TODO: Make these parameters configurable.
    const pollTimeout = 60e3;
    const pollInterval = 5e3;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= pollTimeout) {
        // A timeout is NOT an InvalidDeployment
        throw new TransactionMinedTimeout(deployment);
      }
      debug('verifying deployment tx mined', txHash);
      const tx = await getTransactionByHash(provider, txHash);
      if (tx?.blockHash !== null && tx?.blockHash !== undefined) {
        debug('succeeded verifying deployment tx mined', txHash);
        break;
      }
      debug('waiting for deployment tx mined', txHash);
      await sleep(pollInterval);
    }
  }

  debug('succeeded verifying deployment', txHash);
  if (await hasCode(provider, address)) {
    return;
  }

  throw new InvalidDeployment(deployment);
}

export class TransactionMinedTimeout extends Error {
  constructor(readonly deployment: Deployment) {
    super(`Timed out waiting for transaction ${deployment.txHash}`);
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
