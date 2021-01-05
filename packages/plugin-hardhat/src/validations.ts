import { promises as fs } from 'fs';
import path from 'path';

import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  ValidationDataCurrent,
  ValidationRunData,
  concatRunData,
  isCurrentValidationData,
} from '@openzeppelin/upgrades-core';

export async function writeValidations(hre: HardhatRuntimeEnvironment, newRunData: ValidationRunData): Promise<void> {
  let storedData: ValidationDataCurrent | undefined;

  try {
    storedData = await readValidationData(hre);
  } catch (e) {
    // ENOENT means there is no previous data to append to. We move on and write the file from scratch.
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }

  const validations = concatRunData(newRunData, storedData);

  await fs.mkdir(hre.config.paths.cache, { recursive: true });
  await fs.writeFile(getValidationsCachePath(hre), JSON.stringify(validations, null, 2));
}

export async function readValidations(hre: HardhatRuntimeEnvironment): Promise<ValidationDataCurrent> {
  try {
    return await readValidationData(hre);
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error('Validations log not found. Recompile with `hardhat compile --force`');
    } else {
      throw e;
    }
  }
}

async function readValidationData(hre: HardhatRuntimeEnvironment): Promise<ValidationDataCurrent> {
  const cachePath = getValidationsCachePath(hre);
  const data = JSON.parse(await fs.readFile(cachePath, 'utf8'));
  if (!isCurrentValidationData(data)) {
    await fs.unlink(cachePath);
    throw new ValidationCacheOutdatedError();
  }
  return data;
}

export class ValidationCacheOutdatedError extends Error {
  constructor() {
    super('Validations cache is outdated. Recompile with `hardhat compile --force`');
  }
}

function getValidationsCachePath(hre: HardhatRuntimeEnvironment): string {
  return path.join(hre.config.paths.cache, 'validations.json');
}
