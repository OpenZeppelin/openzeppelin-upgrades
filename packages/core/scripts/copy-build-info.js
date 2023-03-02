#!/usr/bin/env node

const fs = require('fs');
const assert = require('assert');
const path = require('path');

function readJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function hasPropertyStartsWith(obj, prefix) {
  return Object.keys(obj).some(item => {
    return typeof item === 'string' && item.startsWith(prefix);
  });
}

function getBuildInfoFile(contractArtifactSol, contractName) {
  const buildInfoRelativePath = readJSON(`${contractArtifactSol}/${contractName}.dbg.json`).buildInfo;
  return `${contractArtifactSol}/${buildInfoRelativePath}`;
}

function copyMinimalBuildInfo(fromFile, toFile) {
  const buildInfo = readJSON(fromFile);

  const reducedInfo = { solcLongVersion: buildInfo.solcLongVersion, input: buildInfo.input };
  const sources = reducedInfo.input.sources;

  // Assert that the build-info file does NOT contain test contracts
  assert(!hasPropertyStartsWith(sources, 'contracts/test'));

  writeJSON(toFile, reducedInfo);
}

const BeaconProxy = getBuildInfoFile('artifacts/@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol', 'BeaconProxy');
const UpgradeableBeacon = getBuildInfoFile(
  'artifacts/@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol',
  'UpgradeableBeacon',
);
const ERC1967Proxy = getBuildInfoFile(
  'artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol',
  'ERC1967Proxy',
);
const ProxyAdmin = getBuildInfoFile('artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol', 'ProxyAdmin');
const TransparentUpgradeableProxy = getBuildInfoFile(
  'artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol',
  'TransparentUpgradeableProxy',
);

// Assert that each proxy artifact's build-info file is different
const set = new Set();
set.add(path.parse(BeaconProxy).base);
set.add(path.parse(UpgradeableBeacon).base);
set.add(path.parse(ERC1967Proxy).base);
set.add(path.parse(ProxyAdmin).base);
set.add(path.parse(TransparentUpgradeableProxy).base);
assert(set.size === 5);

fs.mkdir('artifacts/proxy-build-info', { recursive: true }, err => {
  if (err) {
    throw err;
  }
});
copyMinimalBuildInfo(BeaconProxy, 'artifacts/proxy-build-info/BeaconProxy.json');
copyMinimalBuildInfo(UpgradeableBeacon, 'artifacts/proxy-build-info/UpgradeableBeacon.json');
copyMinimalBuildInfo(ERC1967Proxy, 'artifacts/proxy-build-info/ERC1967Proxy.json');
copyMinimalBuildInfo(ProxyAdmin, 'artifacts/proxy-build-info/ProxyAdmin.json');
copyMinimalBuildInfo(TransparentUpgradeableProxy, 'artifacts/proxy-build-info/TransparentUpgradeableProxy.json');
