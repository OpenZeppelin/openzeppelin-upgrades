import type { TaskOverrideActionFunction } from 'hardhat/types/tasks';

/**
 * Overrides the built-in `compile` / `build` task so that an outdated or missing
 * validations cache triggers a full recompile automatically.
 *
 * This is the Hardhat 3 equivalent of the Hardhat 2 subtask override that
 * forced `args.force = true` when the cache was detected as stale. Without
 * this, a user who upgrades past a validations-schema bump would have to
 * manually re-run `hardhat compile --force` to regenerate the cache.
 *
 * Fails-closed either way (the cache-check branches inside readValidations
 * always delete the stale file), so this is a UX / parity fix, not a safety
 * fix — see HH3-TODO-FORCE-RECOMPILATION.md for the full analysis.
 */
const action: TaskOverrideActionFunction = async (taskArguments, hre, runSuper) => {
  const { readValidations, ValidationsCacheOutdated, ValidationsCacheNotFound, isLockError } = await import(
    './utils/validations.js'
  );

  let force = taskArguments.force === true;
  if (!force) {
    try {
      await readValidations(hre);
    } catch (e: unknown) {
      if (e instanceof ValidationsCacheOutdated || e instanceof ValidationsCacheNotFound) {
        force = true;
      } else if (isLockError(e)) {
        // Another process holds the lock; let that process handle regeneration.
      } else {
        throw e;
      }
    }
  }

  return runSuper({ ...taskArguments, force });
};

export default action;
