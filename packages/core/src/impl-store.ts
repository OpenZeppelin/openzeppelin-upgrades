import debug from './utils/debug';
import { Manifest, ManifestData, ImplDeployment } from './manifest';
import { EthereumProvider } from './provider';
import { Deployment, InvalidDeployment, resumeOrDeploy, waitAndValidateDeployment } from './deployment';
import type { Version } from './version';
import { Lens, pathLens } from './utils/lenses';

interface LensDescription {
  description: string;
}

async function fetchOrDeployGeneric<T extends Deployment>(
  lens: Lens<ManifestData, T | undefined> & LensDescription,
  provider: EthereumProvider,
  deploy: () => Promise<T>,
): Promise<string> {
  const manifest = await Manifest.forNetwork(provider);

  try {
    const deployment = await manifest.lockedRun(async () => {
      debug('fetching deployment of', lens.description);
      const data = await manifest.read();
      const deployment = lens(data);
      const stored = deployment.get();
      if (stored === undefined) {
        debug('deployment of', lens.description, 'not found');
      }
      const updated = await resumeOrDeploy(provider, stored, deploy);
      if (updated !== stored) {
        deployment.set(updated);
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
        const deployment = lens(data);
        const stored = deployment.get();
        if (stored?.txHash === e.deployment.txHash) {
          deployment.set(undefined);
          await manifest.write(data);
        }
      });
    }

    throw e;
  }
}

export async function fetchOrDeploy(
  version: Version,
  provider: EthereumProvider,
  deploy: () => Promise<ImplDeployment>,
): Promise<string> {
  const implLens = Object.assign(pathLens('impls', version.withoutMetadata), {
    description: `implementation ${version.withoutMetadata}`,
  });
  return fetchOrDeployGeneric(implLens, provider, deploy);
}

export async function fetchOrDeployAdmin(
  provider: EthereumProvider,
  deploy: () => Promise<Deployment>,
): Promise<string> {
  const adminLens = Object.assign(pathLens('admin'), {
    description: 'proxy admin',
  });
  return fetchOrDeployGeneric(adminLens, provider, deploy);
}
