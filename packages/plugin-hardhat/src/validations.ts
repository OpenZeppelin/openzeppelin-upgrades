import { promises as fs } from 'fs';
import path from 'path';

import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Validations, ValidationSet } from '@openzeppelin/upgrades-core';

export async function writeValidations(hre: HardhatRuntimeEnvironment, validations: ValidationSet): Promise<void> {
  const previousValidations = await readValidations(hre);
  await fs.mkdir(hre.config.paths.cache, { recursive: true });
  await fs.writeFile(getValidationsCachePath(hre), JSON.stringify([validations].concat(previousValidations), null, 2));
}

export async function readValidations(hre: HardhatRuntimeEnvironment): Promise<Validations> {
  try {
    return JSON.parse(await fs.readFile(getValidationsCachePath(hre), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error('Validations cache not found. Recompile with `hardhat compile --force`');
    } else {
      throw e;
    }
  }
}

function getValidationsCachePath(hre: HardhatRuntimeEnvironment): string {
  return path.join(hre.config.paths.cache, 'validations.json');
}
