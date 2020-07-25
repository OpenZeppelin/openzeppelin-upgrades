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
    if (tx === null) {
      if (!(await isDevelopmentNetwork(provider))) {
        throw new Error('Invalid transaction in non-development network');
      }
      // If we're in a development network, we silently redeploy.
    } else {
      return cached;
    }
  }

  return deploy();
}

export async function waitAndValidateDeployment(provider: EthereumProvider, deployment: Deployment): Promise<void> {
  const startTime = Date.now();

  // Poll for 60 seconds.
  while (Date.now() - startTime < 60e3) {
    const tx = await getTransactionByHash(provider, deployment.txHash);
    if (tx === null) {
      throw new Error(`Invalid transaction ${deployment.txHash}`);
    }
    if (tx.blockHash !== null) {
      const code = await getCode(provider, deployment.address);
      if (code === '0x') {
        throw new Error(`Transaction ${deployment.txHash} failed to deploy`);
      } else {
        return;
      }
    }
    await sleep(5e3);
  }

  throw new Error(`Timed out waiting for transaction ${deployment.txHash}`);
}
