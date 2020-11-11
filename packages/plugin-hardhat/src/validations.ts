import { promises as fs } from 'fs';
import path from 'path';

import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Validations, ValidationSet } from '@openzeppelin/upgrades-core';

export async function writeValidations(hre: HardhatRuntimeEnvironment, _validations: ValidationSet): Promise<void> {
  let validations = [_validations];
  try {
    const previousValidations: ValidationSet | ValidationSet[] = JSON.parse(
      await fs.readFile(getValidationsCachePath(hre), 'utf8'),
    );
    if (previousValidations !== undefined) {
      validations = validations.concat(previousValidations);
    }
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
  await fs.mkdir(hre.config.paths.cache, { recursive: true });
  await fs.writeFile(getValidationsCachePath(hre), JSON.stringify(validations, null, 2));
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
