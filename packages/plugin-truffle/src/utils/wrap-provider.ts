import { promisify } from 'util';
import crypto from 'crypto';

import { EthereumProvider } from '@openzeppelin/upgrades-core';

import { TruffleProvider } from './truffle';

import { UpgradeOptions, withDefaults } from '.';

export function wrapProvider(provider: TruffleProvider): EthereumProvider {
  const sendAsync = ('sendAsync' in provider ? provider.sendAsync : provider.send).bind(provider);
  const send = promisify(sendAsync);
  return {
    async send(method: string, params: unknown[]) {
      const id = crypto.randomBytes(4).toString('hex');
      const { result, error } = await send({ jsonrpc: '2.0', method, params, id });
      if (error) {
        throw new Error(error.message);
      } else {
        return result;
      }
    },
  };
}

export function wrapWithProvider<A, R>(
  getter: (provider: EthereumProvider, args: A) => R,
): (args: A, opts: UpgradeOptions) => R {
  return (args: A, opts?: UpgradeOptions) => {
    const { deployer } = withDefaults(opts);
    const provider = wrapProvider(deployer.provider);
    return getter(provider, args);
  };
}
