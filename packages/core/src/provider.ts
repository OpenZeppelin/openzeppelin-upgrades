export interface EthereumProvider {
  send(method: 'eth_chainId', params?: []): Promise<string>;
  send(method: 'eth_getCode', params: [string, string?]): Promise<string>;
  send(method: 'eth_getStorageAt', params: [string, string, string?]): Promise<string>;
  send(method: string, params?: unknown[]): Promise<unknown>;
}

export async function getChainId(provider: EthereumProvider): Promise<string> {
  return provider.send('eth_chainId');
}

export async function getStorageAt(
  provider: EthereumProvider,
  address: string,
  position: string,
  block?: string,
): Promise<string> {
  return provider.send('eth_getStorageAt', paramsArray(address, position, block));
}

export async function getCode(provider: EthereumProvider, address: string, block?: string): Promise<string> {
  return provider.send('eth_getCode', paramsArray(address, block));
}

// Ganache will fail if any items in the params array are undefined, so we use
// this function to remove any undefined values from the tail of the array.
// With TypeScript 4.0 it will be possible to statically assert that undefined
// params are in tail position.
function paramsArray<T extends (string | undefined)[]>(...args: T): T {
  const rest = args.splice(args.indexOf(undefined));
  if (rest.some(e => e !== undefined)) {
    throw new Error('Array contains undefined values in non-tail position');
  }
  return args;
}
