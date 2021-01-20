// Adapted from https://github.com/OpenZeppelin/defender-client/pull/24/files
// Remove once PR is merged

export type Network = 'mainnet' | 'ropsten' | 'rinkeby' | 'kovan' | 'goerli' | 'xdai' | 'sokol';

export const Networks: Network[] = ['mainnet', 'ropsten', 'rinkeby', 'kovan', 'goerli', 'xdai', 'sokol'];

export function isValidNetwork(text: string): text is Network {
  return (Networks as string[]).includes(text);
}

export function fromChainId(chainId: number): Network | undefined {
  for (const name of Object.getOwnPropertyNames(chainIds)) {
    const network = name as Network;
    if (chainIds[network] === chainId) {
      return network;
    }
  }
}

export function toChainId(network: Network): number | undefined {
  return chainIds[network];
}

const chainIds: { [key in Network]: number } = {
  mainnet: 1,
  ropsten: 3,
  rinkeby: 4,
  goerli: 5,
  kovan: 42,
  xdai: 100,
  sokol: 77,
};
