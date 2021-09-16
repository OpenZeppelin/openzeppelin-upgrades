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
    storedData = await readValidations(hre);
  } catch (e) {
    // If there is no previous data to append to, we ignore the error and write
    // the file from scratch.
    if (!(e instanceof ValidationsCacheNotFound)) {
      throw e;
    }
  }

  const validations = concatRunData(newRunData, storedData);

  await fs.mkdir(hre.config.paths.cache, { recursive: true });
  await fs.writeFile(getValidationsCachePath(hre), JSON.stringify(validations, null, 2));
}

export async function readValidations(hre: HardhatRuntimeEnvironment): Promise<ValidationDataCurrent> {
  const cachePath = getValidationsCachePath(hre);
  try {
    const data = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    if (!isCurrentValidationData(data)) {
      await fs.unlink(cachePath);
      throw new ValidationsCacheOutdated();
    }
    return data;
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      throw new ValidationsCacheNotFound();
    } else {
      throw e;
    }
  }
}

export class ValidationsCacheNotFound extends Error {
  constructor() {
    super('Validations cache not found. Recompile with `hardhat compile --force`');
  }
}

export class ValidationsCacheOutdated extends Error {
  constructor() {
    super('Validations cache is outdated. Recompile with `hardhat compile --force`');
  }
}

function getValidationsCachePath(hre: HardhatRuntimeEnvironment): string {
  return path.join(hre.config.paths.cache, 'validations.json');
}
