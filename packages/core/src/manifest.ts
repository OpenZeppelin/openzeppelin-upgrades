import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';

interface ManifestData {
  impls: {
    [version in string]?: string;
  };
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

  async getDeployment(version: string): Promise<string | undefined> {
    return (await this.read()).impls[version];
  }

  async storeDeployment(version: string, address: string) {
    await this.update(data => data.impls[version] = address);
  }

  private async read(): Promise<ManifestData> {
    try {
      await fs.access(this.file, fsConstants.R_OK);
    } catch (e) {
      return defaultManifest();
    }
    return JSON.parse(await fs.readFile(this.file, 'utf8')) as ManifestData;
  }

  private async update(updater: (data: ManifestData) => void) {
    const data = await this.read();
    updater(data);
    await fs.mkdir(manifestDir, { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(data, null, 2));
  }
}
