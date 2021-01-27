import path from 'path';
import { promises as fs } from 'fs';
import { EthereumProvider, getChainId, networkNames } from './provider';
import * as t from 'io-ts';
import lockfile from 'proper-lockfile';
import { compare as compareVersions } from 'compare-versions';

import type { Deployment } from './deployment';
import type { StorageLayout } from './storage';

const currentManifestVersion = '3.1';

export interface ManifestData {
  manifestVersion: string;
  impls: {
    [version in string]?: ImplDeployment;
  };
  admin?: Deployment;
}

export interface ImplDeployment extends Deployment {
  layout: StorageLayout;
}

function defaultManifest(): ManifestData {
  return {
    manifestVersion: currentManifestVersion,
    impls: {},
  };
}

const manifestDir = '.openzeppelin';

export class Manifest {
  readonly file: string;
  private locked = false;

  static async forNetwork(provider: EthereumProvider): Promise<Manifest> {
    return new Manifest(await getChainId(provider));
  }

  constructor(chainId: number) {
    const name = networkNames[chainId] ?? `unknown-${chainId}`;
    this.file = path.join(manifestDir, `${name}.json`);
  }

  async getAdmin(): Promise<Deployment | undefined> {
    return (await this.read()).admin;
  }

  async getDeploymentFromAddress(address: string): Promise<ImplDeployment> {
    const data = await this.read();
    const deployment = Object.values(data.impls).find(d => d?.address === address);
    if (deployment === undefined) {
      throw new Error(`Deployment at address ${address} is not registered`);
    }
    return deployment;
  }

  async read(): Promise<ManifestData> {
    const release = this.locked ? undefined : await this.lock();
    try {
      const data = JSON.parse(await fs.readFile(this.file, 'utf8')) as ManifestData;
      return validateOrUpdateManifestVersion(data);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return defaultManifest();
      } else {
        throw e;
      }
    } finally {
      await release?.();
    }
  }

  async write(data: ManifestData): Promise<void> {
    if (!this.locked) {
      throw new Error('Manifest must be locked');
    }
    const normalized = normalizeManifestData(data);
    await fs.writeFile(this.file, JSON.stringify(normalized, null, 2) + '\n');
  }

  async lockedRun<T>(cb: () => Promise<T>): Promise<T> {
    if (this.locked) {
      throw new Error('Manifest is already locked');
    }
    const release = await this.lock();
    try {
      return await cb();
    } finally {
      await release();
    }
  }

  private async lock() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const release = await lockfile.lock(this.file, { retries: 3, realpath: false });
    this.locked = true;
    return async () => {
      await release();
      this.locked = false;
    };
  }
}

function validateOrUpdateManifestVersion(data: ManifestData): ManifestData {
  if (typeof data.manifestVersion !== 'string') {
    throw new Error('Manifest version is missing');
  } else if (compareVersions(data.manifestVersion, '3.0', '<')) {
    throw new Error('Found a manifest file for OpenZeppelin CLI. An automated migration is not yet available.');
  } else if (compareVersions(data.manifestVersion, currentManifestVersion, '<')) {
    return migrateManifest(data);
  } else if (data.manifestVersion === currentManifestVersion) {
    return data;
  } else {
    throw new Error(`Unknown value for manifest version (${data.manifestVersion})`);
  }
}

export function migrateManifest(data: ManifestData): ManifestData {
  if (data.manifestVersion === '3.0') {
    data.manifestVersion = currentManifestVersion;
    return data;
  } else {
    throw new Error('Manifest migration not available');
  }
}

const tNullable = <C extends t.Mixed>(codec: C) => t.union([codec, t.undefined]);

const DeploymentCodec = t.intersection([
  t.strict({
    address: t.string,
  }),
  t.partial({
    txHash: t.string,
  }),
]);

const ManifestDataCodec = t.intersection([
  t.strict({
    manifestVersion: t.string,
    impls: t.record(t.string, tNullable(t.intersection([DeploymentCodec, t.strict({ layout: t.any })]))),
  }),
  t.partial({
    admin: tNullable(DeploymentCodec),
  }),
]);

function normalizeManifestData(data: ManifestData): ManifestData {
  return ManifestDataCodec.encode(data);
}
