import { Manifest, ImplDeployment } from './manifest';
import { EthereumProvider } from './provider';
import { Deployment, InvalidDeployment, resumeOrDeploy, waitAndValidateDeployment } from './deployment';
import type { Version } from './version';

export async function fetchOrDeploy(
  version: Version,
  provider: EthereumProvider,
  deploy: () => Promise<ImplDeployment>,
): Promise<string> {
  const manifest = await Manifest.forNetwork(provider);

  try {
    const deployment = await manifest.lockedRun(async () => {
      const data = await manifest.read();
      const stored = data.impls[version.withoutMetadata];
      const updated = await resumeOrDeploy(provider, stored, deploy);
      if (updated !== stored) {
        data.impls[version.withoutMetadata] = updated;
        await manifest.write(data);
      }
      return updated;
    });

    await waitAndValidateDeployment(provider, deployment);

    return deployment.address;
  } catch (e) {
    // If we run into a deployment error, we remove it from the manifest.
    if (e instanceof InvalidDeployment) {
      await manifest.lockedRun(async () => {
        const data = await manifest.read();
        const stored = data.impls[version.withoutMetadata];
        if (stored.txHash === e.deployment.txHash) {
          delete data.impls[version.withoutMetadata];
          await manifest.write(data);
        }
      });
    }

    throw e;
  }
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
