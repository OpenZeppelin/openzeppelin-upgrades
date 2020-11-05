import { promises as fs } from 'fs';
import path from 'path';

import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Validation } from '@openzeppelin/upgrades-core';

export async function writeValidations(hre: HardhatRuntimeEnvironment, validations: Validation): Promise<void> {
  await fs.mkdir(hre.config.paths.cache, { recursive: true });
  await fs.writeFile(getValidationCachePath(hre), JSON.stringify(validations, null, 2));
}

export async function readValidations(hre: HardhatRuntimeEnvironment): Promise<Validation> {
  try {
    return JSON.parse(await fs.readFile(getValidationCachePath(hre), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error('Validations cache not found. Recompile with `hardhat compile --force`');
    } else {
      throw e;
    }
  }
}

function getValidationCachePath(hre: HardhatRuntimeEnvironment): string {
  return path.join(hre.config.paths.cache, 'validations.json');
}
