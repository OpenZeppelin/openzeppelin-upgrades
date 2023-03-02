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

const buildInfo = readJSON(jsonRelativePath);
const reducedInfo = { solcLongVersion: buildInfo.solcLongVersion, input: buildInfo.input };

const sources = reducedInfo.input.sources;

// Assert that all deployable proxy artifacts exist in ERC1967's build-info file
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol'));
assert(hasProperty(sources, '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol'));

// Assert that the build-info file does NOT contain test contracts
assert(!hasPropertyStartsWith(sources, 'contracts/test'));

writeJSON('artifacts/build-info.json', reducedInfo);
