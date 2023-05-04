#!/usr/bin/env node

const fs = require('fs');
const assert = require('assert');

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function hasProperty(obj, prop) {
  return prop in obj;
}

function hasPropertyStartsWith(obj, prefix) {
  return Object.keys(obj).some(item => {
    return typeof item === 'string' && item.startsWith(prefix);
  });
}

const buildInfoField = readJSON(
  'artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.dbg.json',
).buildInfo;
const jsonRelativePath = `artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/${buildInfoField}`;

// Assert that all deployable proxy artifacts use the same build-info file
assert(
  buildInfoField ===
    readJSON('artifacts/@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol/BeaconProxy.dbg.json').buildInfo,
);
assert(
  buildInfoField ===
    readJSON('artifacts/@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol/UpgradeableBeacon.dbg.json')
      .buildInfo,
);
assert(
  buildInfoField ===
    readJSON(
      'artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.dbg.json',
    ).buildInfo,
);
assert(
  buildInfoField ===
    readJSON('artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.dbg.json').buildInfo,
);

let buildInfo = readJSON(jsonRelativePath);

// To reduce package size, remove output sections not needed for deployment or verification:
// - Keep only the following sections from output.contracts: abi, evm, metadata
//   - This removes AST, and storageLayout
const contractFiles = buildInfo.output.contracts;
for (const contractFile in contractFiles) {
  const contractNames = contractFiles[contractFile];
  for (const contractName in contractNames) {
    contractNames[contractName] = {
      abi: contractNames[contractName].abi,
      evm: contractNames[contractName].evm,
      metadata: contractNames[contractName].metadata, // metadata is needed to determine the license type
    };
  }
}
// - Remove sources
const modifiedOutput = {
  contracts: contractFiles,
};

// Use build-info with custom format and the modified output
const modifiedBuildInfo = {
  ...buildInfo,
  _format: `${buildInfo._format}-oz-slim1`, // Use custom marker to indicate that this is a custom build-info file
  output: modifiedOutput,
};

// Assert input's outputSelection includes all required outputs
const outputSelection = buildInfo.input.settings.outputSelection['*']['*'];
assert(outputSelection.includes('abi'));
assert(outputSelection.includes('evm.bytecode'));
assert(outputSelection.includes('evm.deployedBytecode'));
assert(outputSelection.includes('evm.methodIdentifiers'));
assert(outputSelection.includes('metadata'));

const sources = buildInfo.input.sources;

// Assert that all deployable proxy artifacts exist in ERC1967's build-info file
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol'));

// Assert that the build-info file does NOT contain test contracts
assert(!hasPropertyStartsWith(sources, 'contracts/test'));

writeJSON('artifacts/build-info.json', modifiedBuildInfo);
