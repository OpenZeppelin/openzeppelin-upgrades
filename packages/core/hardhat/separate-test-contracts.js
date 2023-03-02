// Force Hardhat to compile each proxy-related contract in a separate compilation job so that they would each
// appear in a separate compilation artifact file.

const { task } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE } = require('hardhat/builtin-tasks/task-names');

task(TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE, async (params, _, runSuper) => {
  const job = await runSuper(params);
  // If the file is a proxy-related contract, we make a copy of the config and mark it,
  // which will cause it to get compiled separately.
  // Dependencies of each contract would be automatically included in the same compilation.
  const marker = getProxyContractMarker(params.file.sourceName);
  if (marker !== undefined) {
    job.solidityConfig = { ...job.solidityConfig, [marker]: true };
  }
  return job;
});

function getProxyContractMarker(sourceName) {
  if (sourceName === '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol') {
    return Symbol('BeaconProxy');
  } else if (sourceName === '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol') {
    return Symbol('UpgradeableBeacon');
  } else if (sourceName === '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol') {
    return Symbol('ERC1967Proxy');
  } else if (sourceName === '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol') {
    return Symbol('ProxyAdmin');
  } else if (sourceName === '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol') {
    return Symbol('TransparentUpgradeableProxy');
  } else {
    return undefined;
  }
}
