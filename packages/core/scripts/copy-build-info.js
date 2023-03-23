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

// Keep only relevant sections of output.contracts
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

// Adjust correponding output selection
const input = buildInfo.input;

const origSelection = input.settings.outputSelection['*']['*'];
assert(origSelection.includes('abi'));
assert(origSelection.includes('evm.bytecode'));
assert(origSelection.includes('evm.deployedBytecode'));
assert(origSelection.includes('evm.methodIdentifiers'));
assert(origSelection.includes('metadata'));

input.settings.outputSelection['*'] = {
  '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata'],
};

// Keep only relevant sections of build info
buildInfo = {
  _format: buildInfo._format,
  id: buildInfo.id,
  solcVersion: buildInfo.solcVersion,
  solcLongVersion: buildInfo.solcLongVersion,
  input: input,
  output: {
    contracts: contractFiles,
  },
};

const sources = input.sources;

// Assert that all deployable proxy artifacts exist in ERC1967's build-info file
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol'));

// Assert that the build-info file does NOT contain test contracts
assert(!hasPropertyStartsWith(sources, 'contracts/test'));

writeJSON('artifacts/build-info.json', buildInfo);
