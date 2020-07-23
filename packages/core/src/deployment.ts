import { EthereumProvider, getTransactionByHash } from './provider';

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
    // TODO: fail if missing in non-dev chains?
    if (tx !== null) {
      return cached;
    }
  }

  return deploy();
}
