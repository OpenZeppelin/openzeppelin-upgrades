import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';

import { getVersionId } from '.';

interface ImplStore {
  impls: {
    [version in string]?: string;
  };
}

interface EthereumProvider {
  send(method: 'eth_chainId', params?: []): Promise<string>;
  send(method: 'eth_getCode', params: [string, string?]): Promise<string>;
  send(method: string, params?: unknown[]): Promise<unknown>;
}

export async function fetchOrDeploy(
  version: string,
  provider: EthereumProvider,
  deploy: () => Promise<string>,
): Promise<string> {
  const chainId = await getChainId(provider);
  const fetched = await fetchDeployed(chainId, version);

  if (fetched) {
    const code = await provider.send('eth_getCode', [fetched]);
    // TODO: fail if code is missing in non-dev chains?
    if (code !== '0x') {
      return fetched;
    }
  }

  const deployed = await deploy();
  await storeDeployed(chainId, version, deployed);
  return deployed;
}

async function fetchDeployed(chainId: string, version: string): Promise<string | undefined> {
  const storeFile = path.join('.openzeppelin', `${chainId}.json`);
  try {
    await fs.access(storeFile, fsConstants.R_OK);
  } catch (e) {
    return undefined;
  }
  const store = JSON.parse(await fs.readFile(storeFile, 'utf8')) as ImplStore;
  return store.impls[version];
}

async function storeDeployed(chainId: string, version: string, address: string): Promise<void> {
  const storeFile = path.join('.openzeppelin', `${chainId}.json`);
  await fs.mkdir('.openzeppelin', { recursive: true });
  let store: ImplStore = { impls: {} };
  try {
    await fs.access(storeFile, fsConstants.R_OK | fsConstants.W_OK);
    store = JSON.parse(await fs.readFile(storeFile, 'utf8')) as ImplStore;
  } catch (e) {
  }
  store.impls[version] = address;
  await fs.writeFile(storeFile, JSON.stringify(store, null, 2));
}

async function getChainId(provider: EthereumProvider): Promise<string> {
  return provider.send('eth_chainId');
}
