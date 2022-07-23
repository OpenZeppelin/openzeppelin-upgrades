import path from 'path';
import { promises as fs } from 'fs';
import { EthereumProvider, getChainId, networkNames } from './provider';
import lockfile from 'proper-lockfile';
import { compare as compareVersions } from 'compare-versions';

import type { Deployment } from './deployment';
import type { StorageLayout } from './storage';
import { pick } from './utils/pick';
import { mapValues } from './utils/map-values';
import { UpgradesError } from './error';

const currentManifestVersion = '3.2';

export interface ManifestData {
  manifestVersion: string;
  impls: {
    [version in string]?: ImplDeployment;
  };
  proxies: ProxyDeployment[];
  admin?: Deployment;
}

export interface ImplDeployment extends Deployment {
  layout: StorageLayout;
  allAddresses?: string[];
}

export interface ProxyDeployment extends Deployment {
  kind: 'uups' | 'transparent' | 'beacon';
}

function defaultManifest(): ManifestData {
  return {
    manifestVersion: currentManifestVersion,
    impls: {},
    proxies: [],
  };
}

const manifestDir = '.openzeppelin';

export class Manifest {
  readonly chainId: number;
  readonly file: string;
  private readonly fallbackFile: string;

  private locked = false;

  static async forNetwork(provider: EthereumProvider): Promise<Manifest> {
    return new Manifest(await getChainId(provider));
  }

  constructor(chainId: number) {
    this.chainId = chainId;

    const fallbackName = `unknown-${this.chainId}`;
    this.fallbackFile = path.join(manifestDir, `${fallbackName}.json`);

    const name = networkNames[this.chainId] ?? fallbackName;
    this.file = path.join(manifestDir, `${name}.json`);
  }

  async getAdmin(): Promise<Deployment | undefined> {
    return (await this.read()).admin;
  }

  async getDeploymentFromAddress(address: string): Promise<ImplDeployment> {
    const data = await this.read();
    const deployment = Object.values(data.impls).find(
      d => d?.address === address || d?.allAddresses?.includes(address),
    );

    if (deployment === undefined) {
      throw new DeploymentNotFound(`Deployment at address ${address} is not registered`);
    }
    return deployment;
  }

  async getProxyFromAddress(address: string): Promise<ProxyDeployment> {
    const data = await this.read();
    const deployment = data.proxies.find(d => d?.address === address);
    if (deployment === undefined) {
      throw new DeploymentNotFound(`Proxy at address ${address} is not registered`);
    }
    return deployment;
  }

  async addProxy(proxy: ProxyDeployment): Promise<void> {
    await this.lockedRun(async () => {
      const data = await this.read();
      const existing = data.proxies.findIndex(p => p.address === proxy.address);
      if (existing >= 0) {
        data.proxies.splice(existing, 1);
      }
      data.proxies.push(proxy);
      await this.write(data);
    });
  }

  private async exists(file: string): Promise<boolean> {
    try {
      await fs.access(file);
      return true;
    } catch (e: any) {
      return false;
    }
  }

  private async readFile(): Promise<string> {
    if (this.file === this.fallbackFile) {
      return await fs.readFile(this.file, 'utf8');
    } else {
      const fallbackExists = await this.exists(this.fallbackFile);
      const fileExists = await this.exists(this.file);

      if (fileExists && fallbackExists) {
        throw new UpgradesError(
          `Network files with different names ${this.fallbackFile} and ${this.file} were found for the same network.`,
          () =>
            `More than one network file was found for chain ID ${this.chainId}. Determine which file is the most up to date version, then take a backup of and delete the other file.`,
        );
      } else if (fallbackExists) {
        return await fs.readFile(this.fallbackFile, 'utf8');
      } else {
        return await fs.readFile(this.file, 'utf8');
      }
    }
  }

  private async writeFile(content: string): Promise<void> {
    await this.renameFileIfRequired();
    await fs.writeFile(this.file, content);
  }

  private async renameFileIfRequired() {
    if (this.file !== this.fallbackFile && (await this.exists(this.fallbackFile))) {
      try {
        await fs.rename(this.fallbackFile, this.file);
      } catch (e: any) {
        throw new Error(`Failed to rename network file from ${this.fallbackFile} to ${this.file}: ${e.message}`);
      }
    }
  }

  async read(): Promise<ManifestData> {
    const release = this.locked ? undefined : await this.lock();
    try {
      const data = JSON.parse(await this.readFile()) as ManifestData;
      return validateOrUpdateManifestVersion(data);
    } catch (e: any) {
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
    await this.writeFile(JSON.stringify(normalized, null, 2) + '\n');
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
    const lockfileName = path.join(manifestDir, `chain-${this.chainId}`);

    await fs.mkdir(path.dirname(lockfileName), { recursive: true });
    const release = await lockfile.lock(lockfileName, { retries: 3, realpath: false });
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
  switch (data.manifestVersion) {
    case '3.0':
    case '3.1':
      data.manifestVersion = currentManifestVersion;
      data.proxies = [];
      return data;
    default:
      throw new Error('Manifest migration not available');
  }
}

export class DeploymentNotFound extends Error {}

export function normalizeManifestData(input: ManifestData): ManifestData {
  return {
    manifestVersion: input.manifestVersion,
    admin: input.admin && normalizeDeployment(input.admin),
    proxies: input.proxies.map(p => normalizeDeployment(p, ['kind'])),
    impls: mapValues(input.impls, i => i && normalizeDeployment(i, ['layout', 'allAddresses'])),
  };
}

function normalizeDeployment<D extends Deployment>(input: D): Deployment;
function normalizeDeployment<D extends Deployment, K extends keyof D>(input: D, include: K[]): Deployment & Pick<D, K>;
function normalizeDeployment<D extends Deployment, K extends keyof D>(
  input: D,
  include: K[] = [],
): Deployment & Pick<D, K> {
  return pick(input, ['address', 'txHash', ...include]);
}
