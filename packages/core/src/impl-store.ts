import debug from './utils/debug';
import { Manifest, ManifestData, ImplDeployment } from './manifest';
import { EthereumProvider, isDevelopmentNetwork } from './provider';
import { Deployment, InvalidDeployment, resumeOrDeploy, waitAndValidateDeployment } from './deployment';
import type { Version } from './version';
import assert from 'assert';
import { DeployOpts } from '.';

interface ManifestLens<T> {
  description: string;
  type: string;
  (data: ManifestData): ManifestField<T>;
}

interface ManifestField<T> {
  get(): T | undefined;
  set(value: T | undefined): void;
}

/**
 * Fetches the deployment from the manifest, or deploys it if not found.
 *
 * @param lens the manifest lens
 * @param provider the Ethereum provider
 * @param deploy the deploy function
 * @param opts options containing the timeout and pollingInterval parameters. If undefined, assumes the timeout is not configurable and will not mention those parameters in the error message for TransactionMinedTimeout.
 * @returns the deployment address
 * @throws {InvalidDeployment} if the deployment is invalid
 * @throws {TransactionMinedTimeout} if the transaction was not confirmed within the timeout period
 */
async function fetchOrDeployGeneric<T extends Deployment>(
  lens: ManifestLens<T>,
  provider: EthereumProvider,
  deploy: () => Promise<T>,
  opts?: DeployOpts,
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
        await checkForAddressClash(provider, data, updated);
        deployment.set(updated);
        await manifest.write(data);
      }
      return updated;
    });

    await waitAndValidateDeployment(provider, deployment, lens.type, opts);

    return deployment.address;
  } catch (e) {
    // If we run into a deployment error, we remove it from the manifest.
    if (e instanceof InvalidDeployment) {
      await manifest.lockedRun(async () => {
        assert(e instanceof InvalidDeployment); // Not sure why this is needed but otherwise doesn't type
        const data = await manifest.read();
        const deployment = lens(data);
        const stored = deployment.get();
        if (stored?.txHash === e.deployment.txHash) {
          deployment.set(undefined);
          await manifest.write(data);
        }
      });
      e.removed = true;
    }

    throw e;
  }
}

export async function fetchOrDeploy(
  version: Version,
  provider: EthereumProvider,
  deploy: () => Promise<ImplDeployment>,
  opts?: DeployOpts,
): Promise<string> {
  return fetchOrDeployGeneric(implLens(version.linkedWithoutMetadata), provider, deploy, opts);
}

const implLens = (versionWithoutMetadata: string) =>
  lens(`implementation ${versionWithoutMetadata}`, 'implementation', data => ({
    get: () => data.impls[versionWithoutMetadata],
    set: (value?: ImplDeployment) => (data.impls[versionWithoutMetadata] = value),
  }));

export async function fetchOrDeployAdmin(
  provider: EthereumProvider,
  deploy: () => Promise<Deployment>,
  opts?: DeployOpts,
): Promise<string> {
  return fetchOrDeployGeneric(adminLens, provider, deploy, opts);
}

const adminLens = lens('proxy admin', 'proxy admin', data => ({
  get: () => data.admin,
  set: (value?: Deployment) => (data.admin = value),
}));

function lens<T>(description: string, type: string, fn: (data: ManifestData) => ManifestField<T>): ManifestLens<T> {
  return Object.assign(fn, { description, type });
}

async function checkForAddressClash(
  provider: EthereumProvider,
  data: ManifestData,
  updated: Deployment,
): Promise<void> {
  const clash = lookupDeployment(data, updated.address);
  if (clash !== undefined) {
    if (await isDevelopmentNetwork(provider)) {
      debug('deleting a previous deployment at address', updated.address);
      clash.set(undefined);
    } else {
      throw new Error(
        `The following deployment clashes with an existing one at ${updated.address}\n\n` +
          JSON.stringify(updated, null, 2) +
          `\n\n`,
      );
    }
  }
}

function lookupDeployment(data: ManifestData, address: string): ManifestField<Deployment> | undefined {
  if (data.admin?.address === address) {
    return adminLens(data);
  }

  for (const versionWithoutMetadata in data.impls) {
    if (data.impls[versionWithoutMetadata]?.address === address) {
      return implLens(versionWithoutMetadata)(data);
    }
  }
}
