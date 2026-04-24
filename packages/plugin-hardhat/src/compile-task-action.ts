import type { TaskOverrideActionFunction } from 'hardhat/types/tasks';

/**
 * Overrides the built-in `compile` / `build` task so that an outdated or missing
 * validations cache triggers a full recompile automatically.
 *
 * Without this, a user who upgrades past a validations-schema bump would have to
 * manually re-run `hardhat compile --force` to regenerate the cache.
 */
const action: TaskOverrideActionFunction = async (taskArguments, hre, runSuper) => {
  const { readValidations, ValidationsCacheOutdated, ValidationsCacheNotFound } = await import(
    './utils/validations.js'
  );
  const { isErrorCode } = await import('./utils/errors.js');

  let force = taskArguments.force === true;
  if (!force) {
    try {
      await readValidations(hre);
    } catch (e: unknown) {
      if (e instanceof ValidationsCacheOutdated || e instanceof ValidationsCacheNotFound) {
        force = true;
      } else if (isErrorCode(e, 'ELOCKED')) {
        // Another process holds the lock; let that process handle regeneration.
      } else {
        throw e;
      }
    }
  }

  return runSuper({ ...taskArguments, force });
};

export default action;
