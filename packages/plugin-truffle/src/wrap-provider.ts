import { promisify } from 'util';
import crypto from 'crypto';

import { EthereumProvider } from '@openzeppelin/upgrades-core';

import { TruffleProvider } from './truffle';

export function wrapProvider(provider: TruffleProvider): EthereumProvider {
  const web3Send = promisify(provider.send.bind(provider));
  return {
    async send(method: string, params: unknown[]) {
      const id = crypto.randomBytes(4).toString('hex');
      const { result, error } = await web3Send({ method, params, id });
      if (error) {
        throw new Error(error.message);
      } else {
        return result;
      }
    },
  };
}
