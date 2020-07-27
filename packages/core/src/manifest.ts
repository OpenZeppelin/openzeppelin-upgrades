import path from 'path';
import { promises as fs } from 'fs';
import { EthereumProvider, getChainId } from './provider';
import * as t from 'io-ts';
import lockfile from 'proper-lockfile';

import type { Deployment } from './deployment';
import { StorageLayout } from './storage';

export interface ManifestData {
  impls: {
    [version in string]: ImplDeployment;
  };
  admin?: Deployment;
}

export interface ImplDeployment extends Deployment {
  layout: StorageLayout;
}

function defaultManifest(): ManifestData {
  return {
    impls: {},
  };
}

const manifestDir = '.openzeppelin';

export class Manifest {
  file: string;
  private locked = false;

  static async forNetwork(provider: EthereumProvider): Promise<Manifest> {
    return new Manifest(await getChainId(provider));
  }

  constructor(chainId: string) {
    this.file = path.join(manifestDir, `${chainId}.json`);
  }

  async getAdmin(): Promise<Deployment | undefined> {
    return (await this.read()).admin;
  }

  async getDeploymentFromAddress(address: string): Promise<ImplDeployment> {
    const data = await this.read();
    const deployment = Object.values(data.impls).find(d => d.address === address);
    if (deployment === undefined) {
      throw new Error(`Deployment at address ${address} is not registered`);
    }
    return deployment;
  }

  async read(): Promise<ManifestData> {
    const release = this.locked ? undefined : await this.lock();
    try {
      return JSON.parse(await fs.readFile(this.file, 'utf8')) as ManifestData;
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

const ManifestDataCodec = t.intersection([
  t.strict({
    impls: t.record(t.string, t.strict({ address: t.string, layout: t.any })),
  }),
  t.partial({
    admin: t.strict({ address: t.string }),
  }),
]);

function normalizeManifestData(data: ManifestData): ManifestData {
  return ManifestDataCodec.encode(data);
}
