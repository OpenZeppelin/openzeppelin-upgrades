import { promises as fs } from 'fs';
import path from 'path';

import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  ValidationDataCurrent,
  normalizeValidationData,
  concatRunData,
  ValidationRunData,
} from '@openzeppelin/upgrades-core';

export async function writeValidations(hre: HardhatRuntimeEnvironment, newRunData: ValidationRunData): Promise<void> {
  let storedData = normalizeValidationData([]);

  try {
    storedData = normalizeValidationData(JSON.parse(await fs.readFile(getValidationsCachePath(hre), 'utf8')));
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }

  const validations = concatRunData(storedData, newRunData);

  await fs.mkdir(hre.config.paths.cache, { recursive: true });
  await fs.writeFile(getValidationsCachePath(hre), JSON.stringify(validations, null, 2));
}

export async function readValidations(hre: HardhatRuntimeEnvironment): Promise<ValidationDataCurrent> {
  try {
    return normalizeValidationData(JSON.parse(await fs.readFile(getValidationsCachePath(hre), 'utf8')));
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error('Validations log not found. Recompile with `hardhat compile --force`');
    } else {
      throw e;
    }
  }
}

function getValidationsCachePath(hre: HardhatRuntimeEnvironment): string {
  return path.join(hre.config.paths.cache, 'validations.json');
}
