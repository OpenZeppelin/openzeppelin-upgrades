import crypto from 'crypto';

import { ImplDeployment } from './manifest';

function genChainId(): string {
  return '0x' + crypto.randomBytes(8).toString('hex');
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function stubProvider(chainId = genChainId()) {
  const contracts = new Set<string>();
  const pendingTxs = new Set<string>();
  const blocks = new Map<string, string[]>();
  const txBlock = new Map<string, string>();
  const methodCounters = new Map<string, number>();

  function mine() {
    const blockHash = '0x' + crypto.randomBytes(32).toString('hex');
    blocks.set(blockHash, [...pendingTxs]);
    for (const tx of pendingTxs) {
      txBlock.set(tx, blockHash);
    }
    pendingTxs.clear();
  }

  async function deploy(immediate = true): Promise<ImplDeployment> {
    const address = '0x' + crypto.randomBytes(20).toString('hex');
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    contracts.add(address);
    pendingTxs.add(txHash);
    if (immediate) await mine();
    return {
      address,
      txHash,
      layout: {
        storage: [],
        types: {},
      },
    };
  }

  const deployPending = () => deploy(false);

  return {
    mine,
    deploy,
    deployPending,
    get deployCount() {
      return contracts.size;
    },
    isContract(address: string) {
      return contracts.has(address);
    },
    getMethodCount(method: string) {
      return methodCounters.get(method) ?? 0;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send(method: string, params?: unknown[]): Promise<any> {
      methodCounters.set(method, 1 + (methodCounters.get(method) ?? 0));

      if (method === 'eth_chainId') {
        return chainId;
      } else if (method === 'eth_getCode') {
        const param = params?.[0];
        if (typeof param !== 'string') throw new Error('Param must be string');
        if (contracts.has(param)) {
          return '0x1234';
        } else {
          return '0x';
        }
      } else if (method === 'eth_getTransactionByHash') {
        const param = params?.[0];
        if (typeof param !== 'string') throw new Error('Param must be string');
        if (txBlock.has(param) || pendingTxs.has(param)) {
          return {
            blockHash: txBlock.get(param) || null,
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
