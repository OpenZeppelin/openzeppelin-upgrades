import { Manifest, ImplDeployment } from './manifest';
import { EthereumProvider, getChainId, getCode } from './provider';
import { resumeOrDeploy } from './deployment';

export async function fetchOrDeploy(
  version: string,
  provider: EthereumProvider,
  deploy: () => Promise<ImplDeployment>,
): Promise<string> {
  const manifest = new Manifest(await getChainId(provider));
  const fetched = await manifest.getDeployment(version);

  const deployment = await resumeOrDeploy(provider, fetched, deploy);

  if (fetched !== deployment) {
    await manifest.storeDeployment(version, deployment);
  }

  return deployment.address;
}

export async function fetchOrDeployAdmin(provider: EthereumProvider, deploy: () => Promise<string>): Promise<string> {
  const manifest = new Manifest(await getChainId(provider));

  const fetched = await manifest.getAdmin();

  if (fetched) {
    const code = await getCode(provider, fetched);
    if (code !== '0x') {
      return fetched;
    }
  }

  const deployed = await deploy();
  await manifest.setAdmin(deployed);
  return deployed;
}
