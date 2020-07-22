import { Manifest, Deployment } from './manifest';
import { EthereumProvider, getChainId, getCode } from './provider';
import type { Version } from './version';

export async function fetchOrDeploy(
  version: Version,
  provider: EthereumProvider,
  deploy: () => Promise<Deployment>,
): Promise<string> {
  const manifest = new Manifest(await getChainId(provider));

  const fetched = await manifest.getDeployment(version);

  if (fetched) {
    const { address } = fetched;
    const code = await getCode(provider, address);
    // TODO: fail if code is missing in non-dev chains?
    if (code !== '0x') {
      return address;
    }
  }

  const deployed = await deploy();
  await manifest.storeDeployment(version, deployed);
  return deployed.address;
}
