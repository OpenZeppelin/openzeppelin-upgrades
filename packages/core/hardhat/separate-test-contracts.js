// We have some test contracts that contain unsafe code and should not be included for source code verification.
// Thus, we force Hardhat to compile them in a separate compilation job so that they would appear in a separate
// compilation artifact file.

const { task } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE } = require('hardhat/builtin-tasks/task-names');

const marker = Symbol('test');
const markedCache = new WeakMap();

task(TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE, async (params, _, runSuper) => {
  const job = await runSuper(params);
  // If the file is not a proxy contract, we make a copy of the config and mark it, which will cause it to get
  // compiled separately (along with the other marked files).
  // Dependencies of proxy contracts would be automatically included in the proxy contracts compilation.
  if (!params.file.sourceName.startsWith('@openzeppelin/contracts/proxy/')) {
    const originalConfig = job.solidityConfig;
    let markedConfig = markedCache.get(originalConfig);
    if (markedConfig === undefined) {
      markedConfig = { ...originalConfig, [marker]: true };
      markedCache.set(originalConfig, markedConfig);
    }
    job.solidityConfig = markedConfig;
  }
  return job;
});
