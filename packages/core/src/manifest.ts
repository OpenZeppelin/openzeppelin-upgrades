import path from 'path';
import { promises as fs } from 'fs';
import { EthereumProvider, getChainId } from './provider';

import type { Deployment } from './deployment';
import { StorageLayout } from './storage';
import { pick } from './utils/pick';

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

  static async forNetwork(provider: EthereumProvider): Promise<Manifest> {
    return new Manifest(await getChainId(provider));
  }

  constructor(chainId: string) {
    this.file = path.join(manifestDir, `${chainId}.json`);
  }

  async getAdmin(): Promise<Deployment | undefined> {
    return (await this.read()).admin;
  }

  async setAdmin(deployment: Deployment): Promise<void> {
    deployment = pick(deployment, ['address']); // remove excess properties
    await this.update(data => (data.admin = deployment));
  }

  async getDeployment(version: string): Promise<ImplDeployment | undefined> {
    return (await this.read()).impls[version];
  }

  async storeDeployment(version: string, deployment: ImplDeployment): Promise<void> {
    deployment = pick(deployment, ['address', 'layout']); // remove excess properties
    await this.update(data => (data.impls[version] = deployment));
  }

  async getDeploymentFromAddress(address: string): Promise<ImplDeployment> {
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
