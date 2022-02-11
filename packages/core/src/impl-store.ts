import debug from './utils/debug';
import { Manifest, ManifestData, ImplDeployment, AdminDeployment, GenericDeployment } from './manifest';
import { EthereumProvider, getCode, isDevelopmentNetwork, isEmpty } from './provider';
import { Deployment, InvalidDeployment, Reason, resumeOrDeploy, waitAndValidateDeployment } from './deployment';
import { hashBytecode, Version } from './version';
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
  getBytecodeHash(): string | undefined;
  merge?(value: T | undefined): Promise<void>;
}

/**
 * Fetches the deployment from the manifest, or deploys it if not found.
 *
 * @param lens the manifest lens
 * @param provider the Ethereum provider
 * @param deploy the deploy function
 * @param opts options containing the timeout and pollingInterval parameters. If undefined, assumes the timeout is not configurable and will not mention those parameters in the error message for TransactionMinedTimeout.
 * @param merge if true, adds a deployment to existing deployment by merging their addresses. Defaults to false.
 * @returns the deployment address
 * @throws {InvalidDeployment} if the deployment is invalid
 * @throws {TransactionMinedTimeout} if the transaction was not confirmed within the timeout period
 */
async function fetchOrDeployGeneric<T extends GenericDeployment>(
  lens: ManifestLens<T>,
  provider: EthereumProvider,
  deploy: () => Promise<T>,
  opts?: DeployOpts,
  merge?: boolean,
): Promise<string> {
  const manifest = await Manifest.forNetwork(provider);

  try {
    const deployment = await manifest.lockedRun(async () => {
      debug('fetching deployment of', lens.description);
      const data = await manifest.read();
      const deployment = lens(data);
      let updated;
      const stored = await getAndValidate<T>(deployment, lens, provider);
      if (merge) {
        updated = await deploy();
        await checkForAddressClash(provider, data, updated);
        if (deployment.merge) {
          await deployment.merge(updated);
        } else {
          deployment.set(updated);
        }
        await manifest.write(data);
      } else {
        updated = await resumeOrDeploy(provider, stored, deploy);
        if (updated !== stored) {
          await checkForAddressClash(provider, data, updated);
          deployment.set(updated);
          await manifest.write(data);
        }
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
      e.reason = Reason.Removed;
    }

    throw e;
  }
}

async function getAndValidate<T extends GenericDeployment>(
  deployment: ManifestField<T>,
  lens: ManifestLens<T>,
  provider: EthereumProvider,
) {
  let stored = deployment.get();
  if (stored === undefined) {
    debug('deployment of', lens.description, 'not found');
  } else {
    const existingBytecode = await getCode(provider, stored.address);
    const isDevNet = await isDevelopmentNetwork(provider);

    if (isEmpty(existingBytecode)) {
      if (isDevNet) {
        debug('omitting a previous deployment due to no bytecode at address', stored.address);
        stored = undefined;
      } else {
        throw new InvalidDeployment(stored, Reason.NoBytecode);
      }
    } else {
      stored = validate(stored, deployment.getBytecodeHash(), hashBytecode(existingBytecode), isDevNet);
    }
  }
  if (stored === undefined) {
    deployment.set(undefined);
  }
  return stored;
}

function validate<T extends Deployment>(
  deployment: T,
  storedBytecodeHash: string | undefined,
  existingBytecodeHash: string,
  isDevNet: boolean,
) {
  if (storedBytecodeHash !== undefined && storedBytecodeHash !== existingBytecodeHash) {
    if (isDevNet) {
      debug('omitting a previous deployment due to mismatched bytecode at address ', deployment.address);
      return undefined;
    } else {
      throw new InvalidDeployment(deployment, Reason.MismatchedBytecode);
    }
  }
  return deployment;
}

export async function fetchOrDeploy(
  version: Version,
  provider: EthereumProvider,
  deploy: () => Promise<ImplDeployment>,
  opts?: DeployOpts,
  merge?: boolean,
): Promise<string> {
  return fetchOrDeployGeneric(implLens(version.linkedWithoutMetadata), provider, deploy, opts, merge);
}

const implLens = (versionWithoutMetadata: string) =>
  lens(`implementation ${versionWithoutMetadata}`, 'implementation', data => ({
    get: () => data.impls[versionWithoutMetadata],
    set: (value?: ImplDeployment) => (data.impls[versionWithoutMetadata] = value),
    getBytecodeHash: () => data.impls[versionWithoutMetadata]?.bytecodeHash,
    merge: async (value?: ImplDeployment) => {
      const existing = data.impls[versionWithoutMetadata];
      if (existing !== undefined && value !== undefined) {
        const { address, allAddresses } = await mergeAddresses(existing, value);
        data.impls[versionWithoutMetadata] = { ...value, address, allAddresses };
      } else {
        data.impls[versionWithoutMetadata] = value;
      }
    },
  }));

/**
 * Merge the addresses in the deployments and returns them.
 *
 * @param existing existing deployment
 * @param value deployment to add
 */
export async function mergeAddresses(existing: ImplDeployment, value: ImplDeployment) {
  const merged = new Set<string>();

  merged.add(existing.address);
  merged.add(value.address);

  if (existing.allAddresses !== undefined) {
    existing.allAddresses.forEach(item => merged.add(item));
  }
  if (value.allAddresses !== undefined) {
    value.allAddresses.forEach(item => merged.add(item));
  }

  return { address: existing.address, allAddresses: Array.from(merged) };
}

export async function fetchOrDeployAdmin(
  provider: EthereumProvider,
  deploy: () => Promise<Deployment>,
  merge?: DeployOpts,
): Promise<string> {
  return fetchOrDeployGeneric(adminLens, provider, deploy, merge);
}

const adminLens = lens('proxy admin', 'proxy admin', data => ({
  get: () => data.admin,
  set: (value?: AdminDeployment) => (data.admin = value),
  getBytecodeHash: () => data.admin?.bytecodeHash,
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

function lookupDeployment(data: ManifestData, address: string): ManifestField<GenericDeployment> | undefined {
  if (data.admin?.address === address) {
    return adminLens(data);
  }

  for (const versionWithoutMetadata in data.impls) {
    if (
      data.impls[versionWithoutMetadata]?.address === address ||
      data.impls[versionWithoutMetadata]?.allAddresses?.includes(address)
    ) {
      return implLens(versionWithoutMetadata)(data);
    }
  }
}
