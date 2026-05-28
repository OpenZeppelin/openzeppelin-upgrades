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
        // Couldn't check the cache's schema version because another process holds
        // the lock. If the schema is actually outdated, the next readValidations()
        // from deploy/upgrade/validate still detects it and throws
        // ValidationsCacheOutdated with an actionable "recompile with --force"
        // message, so the worst case is a deferred loud error, not silent stale
        // validation.
      } else {
        throw e;
      }
    }
  }

  return runSuper({ ...taskArguments, force });
};

export default action;
