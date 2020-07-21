import { Manifest, ImplDeployment } from './manifest';
import { EthereumProvider, getChainId } from './provider';
import { Deployment, resumeOrDeploy } from './deployment';

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

export async function fetchOrDeployAdmin(
  provider: EthereumProvider,
  deploy: () => Promise<Deployment>,
): Promise<string> {
  const manifest = new Manifest(await getChainId(provider));
  const fetched = await manifest.getAdmin();

  const deployment = await resumeOrDeploy(provider, fetched, deploy);

  if (fetched !== deployment) {
    await manifest.setAdmin(deployment);
  }

  return deployment.address;
}
