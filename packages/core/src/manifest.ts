import path from 'path';
import { promises as fs } from 'fs';

import { StorageLayout } from './storage';
import type { Version } from './version';

interface ManifestData {
  impls: {
    [version in string]: Deployment;
  };
}

export interface Deployment {
  address: string;
  layout: StorageLayout;
}

function defaultManifest() {
  return {
    impls: {},
  };
}

const manifestDir = '.openzeppelin';

export class Manifest {
  file: string;

  constructor(chainId: string) {
    this.file = path.join(manifestDir, `${chainId}.json`);
  }

  async getDeployment(version: Version): Promise<Deployment | undefined> {
    if (version === undefined) {
      throw new Error('The requested contract was not found. Make sure the source code is available for compilation');
    }

    return (await this.read()).impls[version.withoutMetadata];
  }

  async storeDeployment(version: Version, deployment: Deployment): Promise<void> {
    if (version === undefined) {
      throw new Error('The requested contract was not found. Make sure the source code is available for compilation');
    }

    await this.update(data => (data.impls[version.withoutMetadata] = deployment));
  }

  async getDeploymentFromAddress(address: string): Promise<Deployment> {
    const data = await this.read();
    const deployment = Object.values(data.impls).find(d => d.address === address);
    if (deployment === undefined) {
      throw new Error(`Deployment at address ${address} is not registered`);
    }
    return deployment;
  }

  private async read(): Promise<ManifestData> {
    try {
      return JSON.parse(await fs.readFile(this.file, 'utf8')) as ManifestData;
    } catch (e) {
      if (e.code === 'ENOENT') {
        return defaultManifest();
      } else {
        throw e;
      }
    }
  }

  private async update(updater: (data: ManifestData) => void) {
    const data = await this.read();
    updater(data);
    await fs.mkdir(manifestDir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(data, null, 2) + '\n');
  }
}
