import { Manifest, ImplDeployment } from './manifest';
import { EthereumProvider } from './provider';
import { Deployment, resumeOrDeploy } from './deployment';
import type { Version } from './version';

export async function fetchOrDeploy(
  version: Version,
  provider: EthereumProvider,
  deploy: () => Promise<ImplDeployment>,
): Promise<string> {
  const manifest = await Manifest.forNetwork(provider);
  return manifest.lockedRun(async () => {
    const data = await manifest.read();
    const fetched = data.impls[version.withoutMetadata];
    const updated = await resumeOrDeploy(provider, fetched, deploy);
    if (updated !== fetched) {
      data.impls[version.withoutMetadata] = updated;
      await manifest.write(data);
    }
    return updated.address;
  });
}

export async function fetchOrDeployAdmin(
  provider: EthereumProvider,
  deploy: () => Promise<Deployment>,
): Promise<string> {
  const manifest = await Manifest.forNetwork(provider);
  return manifest.lockedRun(async () => {
    const data = await manifest.read();
    const updated = await resumeOrDeploy(provider, data.admin, deploy);
    if (updated !== data.admin) {
      data.admin = updated;
      await manifest.write(data);
    }
    return updated.address;
  });
}
