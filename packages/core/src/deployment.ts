import { promisify } from 'util';

import { EthereumProvider, getTransactionByHash, getCode, isDevelopmentNetwork } from './provider';

const sleep = promisify(setTimeout);

export interface Deployment {
  address: string;
  txHash: string;
}

export async function resumeOrDeploy<T extends Deployment>(
  provider: EthereumProvider,
  cached: T | undefined,
  deploy: () => Promise<T>,
): Promise<T> {
  // If there is a deployment stored, we look its transaction up. If the
  // transaction is found, the deployment is reused.
  if (cached !== undefined) {
    const tx = await getTransactionByHash(provider, cached.txHash);
    if (tx !== null) {
      return cached;
    } else if (!(await isDevelopmentNetwork(provider))) {
      // If the transaction is not found we throw an error, except if we're in
      // a development network then we simply silently redeploy.
      throw new InvalidDeployment(cached);
    }
  }

  return deploy();
}

export async function waitAndValidateDeployment(provider: EthereumProvider, deployment: Deployment): Promise<void> {
  const startTime = Date.now();

  // Poll for 60 seconds with a 5 second poll interval.
  // TODO: Make these parameters configurable.
  while (Date.now() - startTime < 60e3) {
    const tx = await getTransactionByHash(provider, deployment.txHash);
    if (tx === null) {
      throw new InvalidDeployment(deployment);
    }
    if (tx.blockHash !== null) {
      const code = await getCode(provider, deployment.address);
      if (code === '0x') {
        throw new InvalidDeployment(deployment);
      } else {
        return;
      }
    }
    await sleep(5e3);
  }

  // A timeout is NOT an InvalidDeployment
  throw new Error(`Timed out waiting for transaction ${deployment.txHash}`);
}

export class InvalidDeployment extends Error {
  constructor(readonly deployment: Deployment) {
    super(`Invalid deployment ${deployment.txHash}`);
  }
}
