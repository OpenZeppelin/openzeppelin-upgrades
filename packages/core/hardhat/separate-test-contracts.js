// We have some test contracts that contain unsafe code and should not be included for source code verification.
// Thus, we force Hardhat to compile them in a separate compilation job so that they would appear in a separate
// compilation artifact file.

const { task } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE } = require('hardhat/builtin-tasks/task-names');

task(TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE, async (params, _, runSuper) => {
  const job = await runSuper(params);
  // If the file is not a proxy contract, we make a copy of the config and mark it, which will cause it to get
  // compiled separately (along with the other marked files).
  // Dependencies of proxy contracts would be automatically included in the proxy contracts compilation.
  if (!params.file.sourceName.startsWith('@openzeppelin/contracts/proxy/')) {
    // Mark each CLI Solidity file differently from regular tests, so that they can be compiled separately.
    // This is needed because CLI tests validate the entire build-info file, so each build-info should include only relevant contracts.
    if (params.file.sourceName.startsWith('contracts/test/cli/')) {
      mark(job, params.file.sourceName);
    } else if (params.file.sourceName.startsWith('contracts/test/Namespaced')) {
      mark(job, 'testNamespaced');
    } else {
      mark(job, 'test');
    }
  }
  return job;
});

const marker = Symbol('compilation marker');
const markedGroupCache = new Map();

function mark(job, group) {
  let cache = markedGroupCache.get(group);
  if (cache === undefined) {
    cache = new WeakMap();
    markedGroupCache.set(group, cache);
  }

  const originalConfig = job.solidityConfig;

  if (originalConfig[marker] && originalConfig[marker] !== group) {
    throw Error('Same job in different compilation groups');
  }

  let markedConfig = cache.get(originalConfig);
  if (markedConfig === undefined) {
    markedConfig = { ...originalConfig, [marker]: group };
    cache.set(originalConfig, markedConfig);
  }

  job.solidityConfig = markedConfig;
}
