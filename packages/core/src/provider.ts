import BN from 'bn.js';

export interface EthereumProvider {
  send(method: 'eth_chainId', params: []): Promise<string>;
  send(method: 'eth_getCode', params: [string, string]): Promise<string>;
  send(method: 'eth_getStorageAt', params: [string, string, string]): Promise<string>;
  send(method: 'eth_getTransactionByHash', params: [string]): Promise<null | EthereumTransaction>;
  send(method: string, params: unknown[]): Promise<unknown>;
}

interface EthereumTransaction {
  blockHash: string | null;
}

export async function getChainId(provider: EthereumProvider): Promise<number> {
  const id = await provider.send('eth_chainId', []);
  return new BN(id.replace(/^0x/, ''), 'hex').toNumber();
}

export async function getStorageAt(
  provider: EthereumProvider,
  address: string,
  position: string,
  block = 'latest',
): Promise<string> {
  const storage = await provider.send('eth_getStorageAt', [address, position, block]);
  const padded = storage.replace(/^0x/, '').padStart(64, '0');
  return '0x' + padded;
}

export async function getCode(provider: EthereumProvider, address: string, block = 'latest'): Promise<string> {
  return provider.send('eth_getCode', [address, block]);
}

export async function getTransactionByHash(
  provider: EthereumProvider,
  txHash: string,
): Promise<EthereumTransaction | null> {
  return provider.send('eth_getTransactionByHash', [txHash]);
}

export const networkNames: { [chainId in number]?: string } = Object.freeze({
  1: 'mainnet',
  2: 'morden',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'goerli',
  42: 'kovan',
});

export async function isDevelopmentNetwork(provider: EthereumProvider): Promise<boolean> {
  const chainId = await getChainId(provider);
  //  1337 => ganache and geth --dev
  // 31337 => buidler evm
  return chainId === 1337 || chainId === 31337;
}
