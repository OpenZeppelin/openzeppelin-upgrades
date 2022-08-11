export interface EthereumProvider {
  send(method: 'web3_clientVersion', params: []): Promise<string>;
  send(method: 'net_version', params: []): Promise<string>;
  send(method: 'eth_chainId', params: []): Promise<string>;
  send(method: 'eth_getCode', params: [string, string]): Promise<string>;
  send(method: 'eth_call', params: unknown[]): Promise<string>;
  send(method: 'eth_getStorageAt', params: [string, string, string]): Promise<string>;
  send(method: 'eth_getTransactionByHash', params: [string]): Promise<null | EthereumTransaction>;
  send(method: 'eth_getTransactionReceipt', params: [string]): Promise<null | EthereumTransactionReceipt>;
  send(method: string, params: unknown[]): Promise<unknown>;
}

interface EthereumTransaction {
  blockHash: string | null;
  input: string;
}

interface EthereumTransactionReceipt {
  status: string;
  to: string | null;
  from: string;
  blockHash: string;
  blockNumber: string;
  transactionHash: string;
  transactionIndex: string;
}

export async function getNetworkId(provider: EthereumProvider): Promise<string> {
  return provider.send('net_version', []);
}

export async function getChainId(provider: EthereumProvider): Promise<number> {
  const id = await provider.send('eth_chainId', []);
  return parseInt(id.replace(/^0x/, ''), 16);
}

export async function getClientVersion(provider: EthereumProvider): Promise<string> {
  return provider.send('web3_clientVersion', []);
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

export async function call(
  provider: EthereumProvider,
  address: string,
  data: string,
  block = 'latest',
): Promise<string> {
  return provider.send('eth_call', [
    {
      to: address,
      data: data,
    },
    block,
  ]);
}

export async function hasCode(provider: EthereumProvider, address: string, block?: string): Promise<boolean> {
  const code = await getCode(provider, address, block);
  return !isEmpty(code);
}

export function isEmpty(code: string) {
  return code.replace(/^0x/, '') === '';
}

export async function getTransactionByHash(
  provider: EthereumProvider,
  txHash: string,
): Promise<EthereumTransaction | null> {
  return provider.send('eth_getTransactionByHash', [txHash]);
}

export async function getTransactionReceipt(
  provider: EthereumProvider,
  txHash: string,
): Promise<EthereumTransactionReceipt | null> {
  const receipt = await provider.send('eth_getTransactionReceipt', [txHash]);
  if (receipt?.status) {
    receipt.status = receipt.status.match(/^0x0+$/) ? '0x0' : receipt.status.replace(/^0x0+/, '0x');
  }
  return receipt;
}

export const networkNames: { [chainId in number]?: string } = Object.freeze({
  1: 'mainnet',
  2: 'morden',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'goerli',
  42: 'kovan',
  137: 'polygon',
  80001: 'polygon-mumbai',
  43113: 'avalanche-fuji',
  43114: 'avalanche',
});

export async function isDevelopmentNetwork(provider: EthereumProvider): Promise<boolean> {
  const chainId = await getChainId(provider);
  //  1337 => ganache and geth --dev
  // 31337 => hardhat network
  if (chainId === 1337 || chainId === 31337) {
    return true;
  } else {
    const clientVersion = await getClientVersion(provider);
    const [name] = clientVersion.split('/', 1);
    return name === 'HardhatNetwork' || name === 'EthereumJS TestRPC';
  }
}

export function isReceiptSuccessful(receipt: Pick<EthereumTransactionReceipt, 'status'>): boolean {
  return receipt.status === '0x1';
}
