import crypto from 'crypto';

import { ImplDeployment } from './manifest';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function stubProvider() {
  const chainId = '0x' + crypto.randomBytes(8).toString('hex');
  const addresses = new Set<string>();
  const txHashes = new Set<string>();
  return {
    get deployCount() {
      return addresses.size;
    },
    async deploy(): Promise<ImplDeployment> {
      const address = '0x' + crypto.randomBytes(20).toString('hex');
      const txHash = '0x' + crypto.randomBytes(32).toString('hex');
      addresses.add(address);
      txHashes.add(txHash);
      return {
        address,
        txHash,
        layout: {
          storage: [],
          types: {},
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send(method: string, params?: unknown[]): Promise<any> {
      if (method === 'eth_chainId') {
        return chainId;
      } else if (method === 'eth_getCode') {
        const param = params?.[0];
        if (typeof param !== 'string') throw new Error('Param must be string');
        if (addresses.has(param)) {
          return '0x1234';
        } else {
          return '0x';
        }
      } else if (method === 'eth_getTransactionByHash') {
        const param = params?.[0];
        if (typeof param !== 'string') throw new Error('Param must be string');
        if (txHashes.has(param)) {
          return {
            blockHash: '0xb36f346a3d3b5fc3b1ebbc4645017d546220adb3ae18daf908e6d2a162c1dbfc',
          };
        } else {
          return null;
        }
      } else {
        throw new Error(`Method ${method} not stubbed`);
      }
    },
  };
}
