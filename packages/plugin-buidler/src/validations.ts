import { promises as fs } from 'fs';
import path from 'path';

import type { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';
import type { Validation } from '@openzeppelin/upgrades-core';

export async function writeValidations(bre: BuidlerRuntimeEnvironment, validations: Validation): Promise<void> {
  await fs.mkdir(bre.config.paths.cache, { recursive: true });
  await fs.writeFile(getValidationCachePath(bre), JSON.stringify(validations, null, 2));
}

export async function readValidations(bre: BuidlerRuntimeEnvironment): Promise<Validation> {
  return JSON.parse(await fs.readFile(getValidationCachePath(bre), 'utf8'));
}

function getValidationCachePath(bre: BuidlerRuntimeEnvironment): string {
  return path.join(bre.config.paths.cache, 'validations.json');
}
