import debug from './utils/debug';
import { Manifest, ManifestData, ImplDeployment } from './manifest';
import { EthereumProvider } from './provider';
import { Deployment, InvalidDeployment, resumeOrDeploy, waitAndValidateDeployment } from './deployment';
import type { Version } from './version';

interface ManifestLens<T> {
  description: string;
  (data: ManifestData): ManifestField<T>;
}

interface ManifestField<T> {
  get(): T | undefined;
  set(value: T | undefined): void;
}

async function fetchOrDeployGeneric<T extends Deployment>(
  lens: ManifestLens<T>,
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
  return fetchOrDeployGeneric(implLens(version.withoutMetadata), provider, deploy);
}

export async function fetchOrDeployAdmin(
  provider: EthereumProvider,
  deploy: () => Promise<Deployment>,
): Promise<string> {
  return fetchOrDeployGeneric(adminLens, provider, deploy);
}

const adminLens = lens('proxy admin', data => ({
  get: () => data.admin,
  set: (value?: Deployment) => (data.admin = value),
}));

const implLens = (versionWithoutMetadata: string) =>
  lens(`implementation ${versionWithoutMetadata}`, data => ({
    get: () => data.impls[versionWithoutMetadata],
    set: (value?: ImplDeployment) => (data.impls[versionWithoutMetadata] = value),
  }));

function lens<T>(description: string, fn: (data: ManifestData) => ManifestField<T>): ManifestLens<T> {
  return Object.assign(fn, { description });
}
