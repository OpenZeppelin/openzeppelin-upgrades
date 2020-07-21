import { EthereumProvider, getCode } from './provider';

export interface Deployment {
  address: string;
}

export async function resumeOrDeploy<T extends Deployment>(
  provider: EthereumProvider,
  cached: T | undefined,
  deploy: () => Promise<T>,
): Promise<T> {
  if (cached !== undefined) {
    const { address } = cached;
    const code = await getCode(provider, address);
    // TODO: fail if code is missing in non-dev chains?
    if (code !== '0x') {
      return cached;
    }
  }

  return deploy();
}
