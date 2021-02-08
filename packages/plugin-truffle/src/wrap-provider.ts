import { promisify } from 'util';
import crypto from 'crypto';

import { EthereumProvider } from '@openzeppelin/upgrades-core';

import { TruffleProvider } from './truffle';

export function wrapProvider(provider: TruffleProvider): EthereumProvider {
  let web3Send = promisify(provider.send.bind(provider));
  if (provider['sendAsync']!=undefined){
      web3Send = promisify(provider['sendAsync'].bind(provider));
  }
  return {
    async send(method: string, params: unknown[]) {
      const id = crypto.randomBytes(4).toString('hex');
      const { result, error } = await web3Send({ jsonrpc: '2.0', method, params, id });
      if (error) {
        throw new Error(error.message);
      } else {
        return result;
      }
    },
  };
}
