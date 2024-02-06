import { promises as fs } from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';
import type { LockOptions } from 'proper-lockfile';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  ValidationDataCurrent,
  ValidationRunData,
  concatRunData,
  isCurrentValidationData,
} from '@openzeppelin/upgrades-core';

async function lock(file: string) {
  await fs.mkdir(path.dirname(file), { recursive: true });

  const lockRetryOptions = getLockfileOptionsFromEnv();
  const defaultLockRetryOptions = {
    minTimeout: 50,
    factor: 1.3,
  };

  return lockfile.lock(file, {
    retries: lockRetryOptions ?? defaultLockRetryOptions,
    realpath: false,
  });
}

export async function writeValidations(hre: HardhatRuntimeEnvironment, newRunData: ValidationRunData): Promise<void> {
  const cachePath = getValidationsCachePath(hre);
  let releaseLock;
  try {
    releaseLock = await lock(cachePath);
    const storedData = await readValidations(hre, false).catch(e => {
      // If there is no previous data to append to, we ignore the error and write
      // the file from scratch.
      if (e instanceof ValidationsCacheNotFound) {
        return undefined;
      } else {
        throw e;
      }
    });
    const validations = concatRunData(newRunData, storedData);
    await fs.writeFile(cachePath, JSON.stringify(validations, null, 2));
  } finally {
    await releaseLock?.();
  }
}

/**
 * Extracts lockfile options from environment variables.
 * All env variables are prefixed with
 * `OPENZEPPPELIN_HARDHAT_UPGRADES_LOCK_RETRY_OPTIONS_`
 *
 * @note We grab options from env rather than as optional subtask arguments because subtask argument overrides are supported only in hardhat 2.13.0 and above, breaking compatibility with our peer dependency of hardhat ^2.0.2
 * @see https://github.com/NomicFoundation/hardhat/releases/tag/hardhat%402.13.0
 */
export function getLockfileOptionsFromEnv() {
  const lockRetryOptions: LockOptions['retries'] = {};
  const parentEnv = 'OPENZEPPPELIN_HARDHAT_UPGRADES_LOCK_RETRY_OPTIONS';
  const childOptions = ['factor', 'maxRetryTime', 'maxTimeout', 'minTimeout', 'retries'] as const;

  childOptions.forEach(option => {
    const optionEnv = process.env[`${parentEnv}_${option.toUpperCase()}`];

    if (optionEnv) {
      lockRetryOptions[option] = Number(optionEnv);
    }
  });

  if (Object.keys(lockRetryOptions).length === 0) {
    return null;
  }

  return lockRetryOptions;
}

export async function readValidations(
  hre: HardhatRuntimeEnvironment,
  acquireLock = true,
): Promise<ValidationDataCurrent> {
  const cachePath = getValidationsCachePath(hre);
  let releaseLock;
  try {
    if (acquireLock) {
      releaseLock = await lock(cachePath);
    }
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
  } finally {
    await releaseLock?.();
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
